import env from "@manager/env";
import { decode, encode } from "@msgpack/msgpack";
import Redis from "ioredis";
import baseLogger from "./logger";

const patternRegex = /\*|\?|\[/;

const client = new Redis(env.REDIS_URL, {
	retryStrategy: (times) => Math.max(Math.min(Math.exp(times), 20000), 1000),
	maxRetriesPerRequest: null,
});
const logger = baseLogger.child({ service: "redis" });

client.on("connecting", () => {
	logger.debug("Connecting to Redis...");
});
client.on("connect", () => {
	logger.debug("Connected to Redis");
});
client.on("error", (error) => {
	logger.error({ error }, "Redis connection error");
});

const subscriber = client.duplicate();
subscriber.on("error", (error) => {
	logger.error({ error }, "Redis subscriber connection error");
});

export default {
	client,
	subscriber,
	async get<T>(key: string) {
		const value = await client.getBuffer(key);
		if (!value) return null;

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

		if (directKeys.length) await client.unlink(...directKeys);
		if (patternKeys.length) await this.delByPattern(...patternKeys);
	},

	async delByPattern(...patterns: string[]) {
		let deletedCount = 0;

		for (const pattern of patterns) {
			for await (const keys of client.scanStream({ match: pattern })) {
				if (keys.length > 0) {
					deletedCount += await client.unlink(...keys);
				}
			}
		}

		return deletedCount;
	},
};
