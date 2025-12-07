import env from "@backend/env";
import Redis from "ioredis";
import { encode, decode } from "@msgpack/msgpack";
import logger from "./logger";

const patternRegex = /\*|\?|\[/;
const client = new Redis(env.REDIS_URL);

client.on("connect", () => {
	logger.info("Connected to Redis");
});

client.on("error", (error) => {
	logger.error({ error }, "Redis connection error");
});

logger.info("Connecting to Redis...");

export const redisClient = client;

export default {
	async get<T>(key: string): Promise<T | null> {
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
					100
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

	async sadd(key: string, ...members: (string | number)[]): Promise<number> {
		if (members.length === 0) return 0;
		return client.sadd(key, ...members.map(String));
	},

	async srem(key: string, ...members: (string | number)[]): Promise<number> {
		if (members.length === 0) return 0;
		return client.srem(key, ...members.map(String));
	},

	async sismember(key: string, member: string | number): Promise<number> {
		const exists = await client.sismember(key, String(member));
		return exists;
	},

	async smembers(key: string): Promise<string[]> {
		return client.smembers(key);
	},

	async eval(
		script: string,
		keys: string[],
		args: (string | number)[] = []
	): Promise<any> {
		return client.eval(script, keys.length, ...keys, ...args.map(String));
	}
};
