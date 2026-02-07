import Elysia from "elysia";
import type { Logger } from "pino";
import type { CacheAdapter, CacheOptions } from "./types";

export * from "./types";

const parseHTTPDate = (dateString: string) => {
	const date = new Date(dateString);
	return Number.isNaN(date.getTime()) ? null : date;
};

export const createCachingPlugin = (adapter: CacheAdapter, logger?: Logger) =>
	new Elysia({ name: "@jawit/caching" })
		.derive(() => {
			const cache = {
				key: undefined as string | undefined,
				prefix: "",
				suffix: "",
			};

			return {
				cache: {
					set: (key: string) => {
						cache.key = key;
					},
					get: () => {
						const { key, prefix, suffix } = cache;
						if (!key) return null;
						return `${prefix}${key}${suffix}`;
					},
					addPrefix: (prefix: string) => {
						cache.prefix += `${prefix}:`;
					},
					addSuffix: (suffix: string) => {
						cache.suffix += `:${suffix}`;
					},
				},
			};
		})
		.macro({
			cached: (options: CacheOptions | boolean) => {
				if (!options) return;

				const {
					key,
					ttl,
					useETag = true,
					useLastModified = true,
				} = options === true ? {} : options;

				return {
					transform({ cache }) {
						if (key) cache?.set(key);
					},
					async beforeHandle({ cache, headers, set }) {
						const cacheKey = cache?.get();
						if (!cacheKey) return;

						const metadata = await adapter.meta.get(cacheKey);
						if (!metadata) return;

						const clientETag = headers["if-none-match"];
						const clientModifiedSince = headers["if-modified-since"];

						set.headers["cache-control"] = `no-cache`;
						set.headers.etag = useETag ? metadata.etag : undefined;
						set.headers["last-modified"] = useLastModified
							? metadata.lastModified.toISOString()
							: undefined;

						// Check ETag match
						if (useETag && clientETag === metadata.etag) {
							logger?.debug(
								{ key: cacheKey },
								"Cache hit by ETag header, returning 304",
							);
							return new Response(null, { status: 304 });
						}

						// Check If-Modified-Since
						if (useLastModified && clientModifiedSince) {
							const clientDate = parseHTTPDate(clientModifiedSince);

							if (clientDate && clientDate >= metadata.lastModified) {
								logger?.debug(
									{ key: cacheKey },
									"Cache hit by Last-Modified header, returning 304",
								);
								return new Response(null, { status: 304 });
							}
						}

						const cachedData = await adapter.get(cacheKey);
						if (cachedData) {
							logger?.debug({ key: cacheKey }, "Cache hit");
							return cachedData;
						} else {
							logger?.debug({ key: cacheKey }, "Cache miss");
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
								? `"${adapter.generateETag(responseValue)}"`
								: undefined;
							set.headers["last-modified"] = useLastModified
								? new Date().toISOString()
								: undefined;
						}
					},
					async afterResponse({ set, cache, responseValue }) {
						const cacheKey = cache?.get();

						if (set.headers["x-cache"] === "HIT" || set.status !== 200) return;
						if (!cacheKey || !set.headers.etag) return;

						logger?.debug(
							`Caching response for key: ${cacheKey} with TTL: ${ttl}`,
						);

						await Promise.all([
							adapter.set(cacheKey, responseValue, ttl),
							adapter.meta.set(
								cacheKey,
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
