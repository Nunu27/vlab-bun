import env from "@backend/env";
import logger from "@backend/services/logger";
import redis from "@backend/services/redis";
import { Session } from "@backend/types/session";
import type { CacheOptions } from "@backend/types/caching";
import { Elysia, status } from "elysia";

const PREFIX = "cache:";

const buildCacheKey = (
	key: string | undefined,
	personalized: boolean = false,
	ctx: { session?: Session; key?: string }
) => {
	if (!ctx.key && !key) {
		logger.warn("No cacheKey found in context.");
		return;
	}

	key = PREFIX + (ctx.key ?? key);

	if (personalized) {
		if (!ctx.session) {
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
				const rawKey = "cacheKey" in ctx ? (ctx.cacheKey as string) : undefined;
				const session = "session" in ctx ? (ctx.session as Session) : undefined;

				const cacheKey = buildCacheKey(key, personalized, {
					key: rawKey,
					session
				});
				if (!cacheKey) return;

				const cachedData = await redis.get<string>(cacheKey);

				if (cachedData) {
					logger.debug(`Cache hit for key: ${cacheKey}`);
					return status(202, cachedData);
				}
			},
			async afterResponse(ctx) {
				if (ctx.set.status !== 200) return;

				const rawKey = "cacheKey" in ctx ? (ctx.cacheKey as string) : undefined;
				const session = "session" in ctx ? (ctx.session as Session) : undefined;

				const cacheKey = buildCacheKey(key, personalized, {
					key: rawKey,
					session
				});
				if (!cacheKey) return;

				logger.debug(`Caching response for key: ${cacheKey} with TTL: ${ttl}`);
				await redis.set(cacheKey, ctx.responseValue, ttl);
			}
		};
	}
});
