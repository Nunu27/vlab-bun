import Elysia from "elysia";
import type { CacheAdapter, CacheOptions, Logger } from "./types";

export * from "./types";

const parseHTTPDate = (dateString: string) => {
	const date = new Date(dateString);
	return Number.isNaN(date.getTime()) ? null : date;
};

// Ensures the ETag value has exactly one layer of double-quotes,
// regardless of what the adapter's generateETag returns.
const toETag = (raw: string): string => {
	const stripped = raw.replace(/^"(.*)"$/, "$1");
	return `"${stripped}"`;
};

export const createCachingPlugin = <T>(
	adapter: CacheAdapter<T>,
	logger?: Logger,
) =>
	new Elysia({ name: "@jawit/caching" })
		.derive(() => {
			const cacheState = {
				key: undefined as string | undefined,
				prefix: "",
				suffix: "",
			};

			return {
				cache: {
					set: (key: string) => {
						cacheState.key = key;
					},
					get: () => {
						const { key, prefix, suffix } = cacheState;
						if (!key) return null;
						return `${prefix}${key}${suffix}`;
					},
					addPrefix: (prefix: string) => {
						cacheState.prefix += `${prefix}:`;
					},
					addSuffix: (suffix: string) => {
						cacheState.suffix += `:${suffix}`;
					},
					invalidate: (...keys: string[]) => adapter.delete(...keys),
					invalidateAll: () => adapter.clear(),
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

				if (!useETag && !useLastModified) {
					logger?.warn(
						"cached: both `useETag` and `useLastModified` are false — caching will be disabled for this route.",
					);
					return;
				}

				const cacheControl = ttl
					? `max-age=${ttl}, must-revalidate`
					: `max-age=0, must-revalidate`;

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

						set.headers["cache-control"] = cacheControl;
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
						const status = set.status ?? 200;
						const isSuccess =
							typeof status === "number" && status >= 200 && status < 300;

						if (set.headers["cache-control"]) {
							set.headers["x-cache"] = "HIT";
						} else if (isSuccess) {
							set.headers["x-cache"] = "MISS";
							set.headers["cache-control"] = cacheControl;
							set.headers.etag = useETag
								? toETag(adapter.generateETag(responseValue as T))
								: undefined;
							set.headers["last-modified"] = useLastModified
								? new Date().toISOString()
								: undefined;
						}
					},
					async afterResponse({ set, cache, responseValue }) {
						const cacheKey = cache?.get();
						const status = set.status ?? 200;

						if (set.headers["x-cache"] === "HIT" || status !== 200) return;
						if (!cacheKey || !set.headers.etag) return;

						logger?.debug(
							`Caching response for key: ${cacheKey} with TTL: ${ttl}`,
						);

						await Promise.all([
							adapter.set(cacheKey, responseValue as T, ttl),
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
