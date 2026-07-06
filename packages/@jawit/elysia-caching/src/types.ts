/** Compatible with pino, winston, and the native `console` object. */
export type Logger = Pick<typeof console, "info" | "warn" | "error" | "debug">;

export type CacheMetadata = {
	etag: string;
	lastModified: Date;
};

/**
 * Options for the `cached` macro.
 *
 * NOTE: Setting both `useETag` and `useLastModified` to `false` disables
 * caching entirely for that route, as there is no mechanism to track freshness.
 */
export type CacheOptions = {
	key?: string;
	ttl?: number;
	useETag?: boolean;
	useLastModified?: boolean;
};

export interface CacheAdapter<T = unknown> {
	get(key: string): Promise<T | null>;
	/**
	 * Store a value. If `ttl` is omitted, the entry should be stored indefinitely
	 * or use the adapter's own default TTL.
	 */
	set(key: string, value: T, ttl?: number): Promise<void>;
	delete(...keys: string[]): Promise<void>;
	clear(): Promise<void>;
	generateETag(value: T): string;
	meta: {
		get(key: string): Promise<CacheMetadata | null>;
		/**
		 * Store cache metadata. If `ttl` is omitted, the entry should be stored
		 * indefinitely or use the adapter's own default TTL.
		 */
		set(key: string, value: CacheMetadata, ttl?: number): Promise<void>;
	};
}
