import { decode, encode } from "@msgpack/msgpack";
import Redis from "ioredis";
import env from "../env";
import baseLogger from "./logger";

const patternRegex = /\*|\?|\[/;

const client = new Redis(env.REDIS_URL);
const logger = baseLogger.child({ service: "redis" });

client.on("connect", () => {
	logger.debug("Connected to Redis");
});

client.on("error", (error) => {
	logger.error({ error }, "Redis connection error");
});

logger.debug("Connecting to Redis...");

export default {
	client,
	async get<T>(key: string) {
		const value = await client.getBuffer(key);
		if (!value) {
			return null;
		}

		try {
			return decode(value) as T;
		} catch (error) {
			logger.warn({ key, error }, "Failed to decode Redis value");
			return null;
		}
	},

	async set(key: string, value: unknown, ttl?: number) {
		const encoded = Buffer.from(encode(value));
		if (ttl) {
			await client.setex(key, ttl, encoded);
		} else {
			await client.set(key, encoded);
		}
	},

	async expire(key: string, ttl: number) {
		await client.expire(key, ttl);
	},

	async del(...keys: string[]) {
		const directKeys: string[] = [];
		const patternKeys: string[] = [];

		for (const key of keys) {
			if (patternRegex.test(key)) {
				patternKeys.push(key);
			} else {
				directKeys.push(key);
			}
		}

		if (directKeys.length) await client.del(...directKeys);

		for (const pattern of patternKeys) {
			await this.delByPattern(pattern);
		}
	},

	async delByPattern(pattern: string) {
		if (!patternRegex.test(pattern)) {
			throw new Error("Invalid pattern.");
		}

		const keysToDelete: string[] = [];
		let cursor = "0";
		let deletedCount = 0;

		try {
			do {
				const [nextCursor, keys] = await client.scan(
					cursor,
					"MATCH",
					pattern,
					"COUNT",
					100,
				);

				if (keys.length > 0) {
					keysToDelete.push(...keys);
				}

				cursor = nextCursor;
			} while (cursor !== "0");

			if (keysToDelete.length) {
				deletedCount += await client.del(...keysToDelete);
			}
		} catch (error) {
			logger.error({ error }, "An error occurred while deleting Redis keys.");
		}

		return deletedCount;
	},
};
