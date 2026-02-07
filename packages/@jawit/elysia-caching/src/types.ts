export type CacheMetadata = {
	etag: string;
	lastModified: Date;
};

export type CacheOptions = {
	key?: string;
	ttl?: number;
	useETag?: boolean;
	useLastModified?: boolean;
};

export interface CacheAdapter {
	get(key: string): Promise<unknown>;
	set(key: string, value: unknown, ttl?: number): Promise<void>;
	delete(...keys: string[]): Promise<void>;
	clear(): Promise<void>;
	generateETag(value: unknown): string;
	meta: {
		get(key: string): Promise<CacheMetadata | null>;
		set(key: string, value: CacheMetadata, ttl?: number): Promise<void>;
	};
}
