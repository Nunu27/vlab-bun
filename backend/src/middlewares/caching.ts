import env from "@/env";
import logger from "@/services/logger";
import redis from "@/services/redis";
import { Elysia } from "elysia";

const PREFIX = "cache:";

interface CacheOptions {
	key?: string;
	personalized?: boolean;
	ttl?: number;
}

const buildCacheKey = (
	key: string | undefined,
	ctx: any,
	personalized: boolean = false
) => {
	const haveSession = "session" in ctx;
	const haveCacheKey = "cacheKey" in ctx;

	if (!haveCacheKey && !key) {
		logger.warn("No cacheKey found in context.");
		return;
	}

	key = PREFIX + (ctx.cacheKey ?? key);

	if (personalized) {
		if (!haveSession) {
			logger.warn("No session found in context.");
			return;
		}

		key += `:${ctx.session.id}`;
	}

	return key;
};

export const setCache = async <T>(key: string, value: T, ttl: number) => {
	await redis.set(PREFIX + key, JSON.stringify(value), ttl);
};

export const deleteCache = async (...keys: string[]) => {
	await redis.del(...keys.map((key) => PREFIX + key));
};

export const clearCache = async () => {
	const deletedCount = await redis.delByPattern(PREFIX + "*");
	if (deletedCount) {
		logger.info(`Cleared ${deletedCount} cache entries.`);
	}
};

export default new Elysia().macro({
	cached(options: CacheOptions | boolean) {
		if (options === false) return;
		if (options === true) options = {};

		const { key, ttl = env.SESSION_TTL, personalized = false } = options;

		return {
			async beforeHandle(ctx) {
				const cacheKey = buildCacheKey(key, ctx, personalized);
				if (!cacheKey) return;

				const cachedData = await redis.get<string>(cacheKey);

				if (cachedData) {
					logger.debug(`Cache hit for key: ${cacheKey}`);
					return cachedData;
				}
			},
			async afterResponse(ctx) {
				if (ctx.set.status !== 200) return;

				const cacheKey = buildCacheKey(key, ctx, personalized);
				if (!cacheKey) return;

				logger.debug(`Caching response for key: ${cacheKey} with TTL: ${ttl}`);
				await redis.set(cacheKey, ctx.responseValue, ttl);
			}
		};
	}
});
