import env from "@backend/env";
import { childLogger } from "@backend/services/logger";
import redis from "@backend/services/redis";
import type {
	CacheHeaders,
	CacheMetadata,
	CacheOptions
} from "@backend/types/caching";
import { md5 } from "@backend/utils/crypto";
import { encode } from "@msgpack/msgpack";
import type { Session } from "@vlab/shared/types";
import { Elysia } from "elysia";

const PREFIX = "cache";
const DATA_PREFIX = `${PREFIX}:data:`;
const META_PREFIX = `${PREFIX}:meta:`;

const logger = childLogger("caching");

const buildCacheKey = (
	key: string | undefined,
	personalized: boolean = false,
	ctx: {
		session: { data: Session | null };
		key?: string;
	}
) => {
	const baseKey = key ?? ctx.key;

	if (!baseKey) {
		logger.warn("No cache key provided");
		return;
	}

	let cacheKey = baseKey;

	if (personalized) {
		if (!ctx.session.data) {
			logger.warn("Personalized cache requested but no session found.");
			return;
		}
		cacheKey += `:${ctx.session.data.id}`;
	}

	return cacheKey;
};

const generateETag = (data: unknown) => {
	return `"${md5(encode(data))}"`;
};

const parseHTTPDate = (dateString: string) => {
	const date = new Date(dateString);
	return isNaN(date.getTime()) ? null : date;
};

export const deleteCache = async (...keys: string[]) => {
	const allKeys = keys.flatMap((key) => [DATA_PREFIX + key, META_PREFIX + key]);
	await redis.del(...allKeys);
};

export const clearCache = async () => {
	const deletedCount = await redis.delByPattern(PREFIX + "*");
	if (deletedCount) {
		logger.info(`Cleared ${deletedCount} cache entries.`);
	}
};

export default new Elysia()
	.resolve(
		{ as: "global" },
		() =>
			({}) as {
				cacheKey?: string;
				session: { data: Session | null };
				cacheMetadata?: CacheMetadata;
				fromCache?: boolean;
			}
	)
	.macro({
		cached(options: CacheOptions | boolean) {
			if (options === false) return;
			if (options === true) options = {};

			const {
				key,
				ttl = env.SESSION_TTL,
				personalized = false,
				etag = true,
				lastModified = true
			} = options;

			return {
				async beforeHandle(ctx) {
					const { cacheKey: rawKey, session, headers } = ctx;
					const cacheKey = buildCacheKey(key, personalized, {
						key: rawKey,
						session
					});
					if (!cacheKey) return;

					const metadata = await redis.get<CacheMetadata>(
						META_PREFIX + cacheKey
					);
					if (!metadata) return;

					const {
						"if-none-match": clientETag,
						"if-modified-since": clientModifiedSince
					} = headers as CacheHeaders;

					ctx.cacheMetadata = metadata;

					// Check ETag match
					if (etag && clientETag === metadata.etag) {
						logger.debug(`ETag match for key: ${cacheKey}, returning 304`);
						return new Response(null, { status: 304 });
					}

					// Check If-Modified-Since
					if (lastModified && clientModifiedSince) {
						const clientDate = parseHTTPDate(clientModifiedSince);

						if (clientDate && clientDate >= metadata.lastModified) {
							logger.debug(
								`Not modified since ${clientModifiedSince} for key: ${cacheKey}, returning 304`
							);
							return new Response(null, { status: 304 });
						}
					}

					const cachedData = await redis.get(DATA_PREFIX + cacheKey);
					if (cachedData) {
						logger.debug(`Cache hit for key: ${cacheKey}`);
						return cachedData;
					} else {
						logger.debug(`Cache miss for key: ${cacheKey}`);
						ctx.cacheMetadata = undefined;
					}
				},
				afterHandle(ctx) {
					const { set, responseValue } = ctx;

					if (!ctx.cacheMetadata) {
						set.headers["x-cache"] = "MISS";
						ctx.cacheMetadata = {
							etag: generateETag(responseValue),
							lastModified: new Date()
						};
					} else {
						set.headers["x-cache"] = "HIT";
						ctx.fromCache = true;
					}

					set.headers["cache-control"] = `no-cache`;
					set.headers["etag"] = etag ? ctx.cacheMetadata.etag : undefined;
					set.headers["last-modified"] = lastModified
						? ctx.cacheMetadata.lastModified.toISOString()
						: undefined;
				},
				async afterResponse({
					set,
					cacheKey: rawKey,
					session,
					responseValue,
					fromCache,
					cacheMetadata
				}) {
					if (fromCache || !cacheMetadata || set.status !== 200) return;

					const cacheKey = buildCacheKey(key, personalized, {
						key: rawKey,
						session
					});
					if (!cacheKey) return;

					logger.debug(
						`Caching response for key: ${cacheKey} with TTL: ${ttl}`
					);

					// Store both data and metadata
					await Promise.all([
						redis.set(DATA_PREFIX + cacheKey, responseValue, ttl),
						redis.set(META_PREFIX + cacheKey, cacheMetadata, ttl)
					]);
				}
			};
		}
	});
