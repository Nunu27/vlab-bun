export type CacheOptions = {
	key?: string;
	ttl?: number;
	personalized?: boolean;
	etag?: boolean; // Enable/disable ETag support
	lastModified?: boolean; // Enable/disable Last-Modified support
};

export type CacheMetadata = {
	etag: string;
	lastModified: Date;
};

export type CacheHeaders = {
	"if-none-match"?: string;
	"if-modified-since"?: string;
};
