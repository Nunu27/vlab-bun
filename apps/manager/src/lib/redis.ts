import env from "@manager/env";
import { decode, encode } from "@msgpack/msgpack";
import Redis from "ioredis";
import baseLogger from "./logger";

const patternRegex = /\*|\?|\[/;

const client = new Redis(env.REDIS_URL, {
	retryStrategy: (times) => Math.max(Math.min(Math.exp(times), 20000), 1000),
	maxRetriesPerRequest: null,
});
const logger = baseLogger.child({ service: "redis" });

client.on("connecting", () => {
	logger.debug("Connecting to Redis...");
});
client.on("connect", () => {
	logger.debug("Connected to Redis");
});
client.on("error", (error) => {
	logger.error({ error }, "Redis connection error");
});

const subscriber = client.duplicate();
subscriber.on("error", (error) => {
	logger.error({ error }, "Redis subscriber connection error");
});

type ScanPlan = {
	match: string;
	isExact: boolean;
	matches: (key: string) => boolean;
};

function escapeGlobLiteral(value: string) {
	return value.replace(/[\\*?[\]]/g, "\\$&");
}

function escapeCharacterClass(value: string) {
	return value.replace(/[\\\]\-^]/g, "\\$&");
}

function normalizePrefix(value: string) {
	// Accept either "cache:a:" or "cache:a:*".
	const prefix = value.endsWith("*") ? value.slice(0, -1) : value;

	if (prefix.includes("*")) {
		throw new Error(
			`Only literal prefixes with an optional trailing "*" are supported: ${value}`,
		);
	}

	return prefix;
}

function removeRedundantPrefixes(prefixes: string[]) {
	const sorted = [...new Set(prefixes)].sort((a, b) => a.length - b.length);

	return sorted.filter(
		(prefix, index) =>
			!sorted.slice(0, index).some((parent) => prefix.startsWith(parent)),
	);
}

function longestCommonPrefix(values: string[]) {
	let result = values[0] ?? "";

	for (const value of values.slice(1)) {
		let index = 0;

		while (
			index < result.length &&
			index < value.length &&
			result[index] === value[index]
		) {
			index++;
		}

		result = result.slice(0, index);
	}

	return result;
}

function createExactGlob(prefixes: string[]) {
	const length = prefixes[0]?.length ?? 0;

	if (!prefixes.every((prefix) => prefix.length === length)) {
		return undefined;
	}

	const columns = Array.from({ length }, (_, index) => {
		return [...new Set(prefixes.map((prefix) => prefix[index]))];
	});

	const combinationCount = columns.reduce(
		(total, characters) => total * characters.length,
		1,
	);

	if (combinationCount !== prefixes.length) {
		return undefined;
	}

	return `${columns
		.map((characters) => {
			if (characters.length === 1) {
				return escapeGlobLiteral(characters[0]);
			}

			return `[${characters.map(escapeCharacterClass).join("")}]`;
		})
		.join("")}*`;
}

export function createScanPlan(values: readonly string[]): ScanPlan {
	const prefixes = removeRedundantPrefixes(values.map(normalizePrefix));

	if (prefixes.length === 0) {
		throw new Error("At least one prefix is required");
	}

	const exactMatch = createExactGlob(prefixes);

	return {
		match: exactMatch ?? `${escapeGlobLiteral(longestCommonPrefix(prefixes))}*`,
		isExact: exactMatch !== undefined,
		matches: (key) => prefixes.some((prefix) => key.startsWith(prefix)),
	};
}

export default {
	client,
	subscriber,
	async get<T>(key: string) {
		const value = await client.getBuffer(key);
		if (!value) return null;

		try {
			return decode(value) as T;
		} catch (error) {
			logger.warn({ key, error }, "Failed to decode Redis value");
			return null;
		}
	},

	async set(key: string, value: unknown, ttl?: number) {
		const encoded = Buffer.from(encode(value));
		if (ttl) {
			await client.setex(key, ttl, encoded);
		} else {
			await client.set(key, encoded);
		}
	},

	async expire(key: string, ttl: number) {
		await client.expire(key, ttl);
	},

	async del(...keys: string[]) {
		const directKeys: string[] = [];
		const patternKeys: string[] = [];

		for (const key of keys) {
			if (patternRegex.test(key)) {
				patternKeys.push(key);
			} else {
				directKeys.push(key);
			}
		}

		if (directKeys.length) await client.unlink(...keys);
		if (patternKeys.length) await this.delByPrefix(...patternKeys);
	},

	async delByPrefix(...prefixes: string[]) {
		const plan = createScanPlan(prefixes);
		let deletedCount = 0;

		for await (const keys of client.scanStream({ match: plan.match })) {
			const keysToDelete = plan.isExact ? keys : keys.filter(plan.matches);

			if (keysToDelete.length > 0) {
				const deleted = await client.unlink(...keysToDelete);
				deletedCount += deleted;
			}
		}

		return deletedCount;
	},
};
