import Elysia from "elysia";
import type { CacheAdapter, CacheOptions } from "./types";

export * from "./types";

const parseHTTPDate = (dateString: string) => {
	const date = new Date(dateString);
	return Number.isNaN(date.getTime()) ? null : date;
};

export const createCachingPlugin = (adapter: CacheAdapter) =>
	new Elysia({ name: "@jawit/caching" })
		.derive(() => ({ cacheKey: undefined as string | undefined }))
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
					resolve({ cacheKey }) {
						const finalKey = key ?? cacheKey;
						return { cacheKey: finalKey ?? null };
					},
					async beforeHandle({ cacheKey, headers, set }) {
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
							return new Response(null, { status: 304 });
						}

						// Check If-Modified-Since
						if (useLastModified && clientModifiedSince) {
							const clientDate = parseHTTPDate(clientModifiedSince);

							if (clientDate && clientDate >= metadata.lastModified) {
								return new Response(null, { status: 304 });
							}
						}

						const cachedData = await adapter.get(cacheKey);
						if (cachedData) {
							return cachedData;
						} else {
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
					async afterResponse({ set, cacheKey, responseValue }) {
						if (set.headers["x-cache"] === "HIT" || set.status !== 200) return;
						if (!cacheKey || !set.headers.etag) return;

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
