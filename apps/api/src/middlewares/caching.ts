import env from "@api/env";
import baseLogger from "@api/services/logger";
import redis from "@api/services/redis";
import { encode } from "@msgpack/msgpack";
import Elysia from "elysia";
import auth from "./auth";

const PREFIX = "cache";
const DATA_PREFIX = `${PREFIX}:data:`;
const META_PREFIX = `${PREFIX}:meta:`;

const logger = baseLogger.child({ service: "caching" });

type CacheOptions = {
	key?: string;
	ttl?: number;
	personalized?: boolean;
	useETag?: boolean; // Enable/disable ETag support
	useLastModified?: boolean; // Enable/disable Last-Modified support
};

type CacheMetadata = {
	etag: string;
	lastModified: Date;
};

const parseHTTPDate = (dateString: string) => {
	const date = new Date(dateString);
	return Number.isNaN(date.getTime()) ? null : date;
};

export const deleteCache = async (...keys: string[]) => {
	logger.debug(`Deleting cache for keys: ${keys.join(", ")}`);

	const allKeys = keys.flatMap((key) => [DATA_PREFIX + key, META_PREFIX + key]);
	await redis.del(...allKeys);
};

export const clearCache = async () => {
	const deletedCount = await redis.delByPattern(`${PREFIX}:*`);
	if (deletedCount) {
		logger.debug(`Cleared ${deletedCount} cache entries.`);
	}
};

export default new Elysia({ name: "caching" })
	.use(auth)
	.derive(() => ({ cacheKey: undefined as string | undefined }))
	.macro({
		cached: (options: CacheOptions | boolean) => {
			if (!options) return;

			const {
				key,
				ttl = env.SESSION_TTL,
				personalized = false,
				useETag = true,
				useLastModified = true,
			} = options === true ? {} : options;

			const usingLastModified = useLastModified && !personalized;

			return {
				protected: true,
				resolve: ({ cacheKey, session }) => {
					let finalKey = key ?? cacheKey;

					if (!finalKey || (personalized && !session?.data)) {
						return { cacheKey: null };
					} else if (personalized) {
						finalKey += `:${session?.data?.id}`;
					}

					return { cacheKey: finalKey };
				},
				beforeHandle: async ({ cacheKey, headers, set }) => {
					if (!cacheKey) return;

					const metadata = await redis.get<CacheMetadata>(
						META_PREFIX + cacheKey,
					);
					if (!metadata) return;

					const clientETag = headers["if-none-match"];
					const clientModifiedSince = headers["if-modified-since"];

					set.headers["cache-control"] = `no-cache`;
					set.headers.etag = useETag ? metadata.etag : undefined;
					set.headers["last-modified"] = usingLastModified
						? metadata.lastModified.toISOString()
						: undefined;

					// Check ETag match
					if (useETag && clientETag === metadata.etag) {
						logger.debug(
							{ key: cacheKey },
							"Cache hit by ETag header, returning 304",
						);
						return new Response(null, { status: 304 });
					}

					// Check If-Modified-Since
					if (useLastModified && clientModifiedSince) {
						const clientDate = parseHTTPDate(clientModifiedSince);

						if (clientDate && clientDate >= metadata.lastModified) {
							logger.debug(
								{ key: cacheKey },
								"Cache hit by Last-Modified header, returning 304",
							);
							return new Response(null, { status: 304 });
						}
					}

					const cachedData = await redis.get(DATA_PREFIX + cacheKey);
					if (cachedData) {
						logger.debug({ key: cacheKey }, "Cache hit");
						return cachedData;
					} else {
						logger.debug({ key: cacheKey }, "Cache miss");
						set.headers["cache-control"] = undefined;
					}
				},
				afterHandle({ set, responseValue }) {
					if (set.headers["cache-control"]) {
						set.headers["x-cache"] = "HIT";
					} else {
						set.headers["x-cache"] = "MISS";
						set.headers["cache-control"] = `no-cache`;
						set.headers.etag = useETag
							? `"${new Bun.CryptoHasher("md5").update(encode(responseValue)).digest("hex")}"`
							: undefined;
						set.headers["last-modified"] = usingLastModified
							? new Date().toISOString()
							: undefined;
					}
				},
				async afterResponse({ set, cacheKey, responseValue }) {
					if (set.headers["x-cache"] === "HIT" || set.status !== 200) return;
					if (!cacheKey) return;

					logger.debug(
						`Caching response for key: ${cacheKey} with TTL: ${ttl}`,
					);

					await Promise.all([
						redis.set(DATA_PREFIX + cacheKey, responseValue, ttl),
						redis.set(
							META_PREFIX + cacheKey,
							{
								etag: set.headers.etag,
								lastModified:
									parseHTTPDate(set.headers["last-modified"] ?? "") ??
									new Date(),
							},
							ttl,
						),
					]);
				},
			};
		},
	})
	.as("scoped");
