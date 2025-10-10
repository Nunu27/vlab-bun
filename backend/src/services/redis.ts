import env from "@/env";
import { RedisClient } from "bun";
import logger from "./logger";

const client = new RedisClient(env.REDIS_URL);

logger.info("Connecting to Redis...");
await client.connect();
logger.info("Connected to Redis");

export default {
	get: async <T>(key: string): Promise<T | null> => {
		const value = await client.get(key);
		return value ? (JSON.parse(value) as T) : null;
	},
	set: async (key: string, value: unknown, ttl?: number): Promise<void> => {
		await client.set(key, JSON.stringify(value));
		if (ttl) {
			await client.expire(key, ttl);
		}
	},
	expire: async (key: string, ttl: number): Promise<void> => {
		await client.expire(key, ttl);
	},
	del: async (key: string): Promise<void> => {
		await client.del(key);
	}
};
