import {
	type CacheAdapter,
	type CacheMetadata,
	createCachingPlugin,
} from "@jawit/elysia-caching";
import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import { md5 } from "@manager/utils/hash";
import { encode } from "@msgpack/msgpack";
import type { Session } from "@vlab/shared/types";
import Elysia from "elysia";
import auth from "./auth";

const PREFIX = "cache";
const DATA_PREFIX = `${PREFIX}:data:`;
const META_PREFIX = `${PREFIX}:meta:`;

const logger = baseLogger.child({ service: "caching" });

export const cache: CacheAdapter = {
	get: (key) => redis.get(DATA_PREFIX + key),
	set: (key, value, ttl) => redis.set(DATA_PREFIX + key, value, ttl),
	delete: async (...keys) => {
		logger.debug(`Deleting cache for keys: ${keys.join(", ")}`);
		const allKeys = keys.flatMap((key) => [
			DATA_PREFIX + key,
			META_PREFIX + key,
		]);
		await redis.del(...allKeys);
	},
	clear: async () => {
		const deletedCount = await redis.delByPrefix(PREFIX);
		if (deletedCount) {
			logger.debug(`Cleared ${deletedCount} cache entries.`);
		}
	},
	generateETag: (value) => md5(encode(value)),
	meta: {
		get: (key) => redis.get<CacheMetadata>(META_PREFIX + key),
		set: (key, value, ttl) => redis.set(META_PREFIX + key, value, ttl),
	},
};

export default new Elysia({ name: "caching" })
	.use(auth)
	.use(createCachingPlugin(cache, logger))
	.macro({
		personalized: {
			protected: true,
			resolve({ cache, session }) {
				const userId = session?.data?.id;
				if (!cache?.get() || !userId) return;

				cache.addSuffix(userId);

				return {
					session: {
						...session,
						data: session.data as Session,
					},
				};
			},
			beforeHandle: ({ headers }) => {
				headers["last-modified"] = undefined;
			},
			afterHandle({ set }) {
				set.headers["last-modified"] = undefined;
			},
		},
	})
	.as("scoped");
