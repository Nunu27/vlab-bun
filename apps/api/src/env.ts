import "dotenv/config";

import dns from "node:dns/promises";
import { Value } from "@sinclair/typebox/value";
import { TypeCompiler, t } from "elysia/type-system";

const EnvSchema = t.Object(
	{
		// System
		NODE_ENV: t.Union([
			t.Literal("development"),
			t.Literal("production"),
			t.Literal("test"),
		]),

		ENABLE_OPENAPI: t.Boolean({ default: false }),

		PORT: t.Number({ default: 3000 }),
		DISPLAY_PORT: t.Number({ default: 8080 }),

		DATABASE_URL: t.String({ format: "uri" }),
		REDIS_URL: t.String({ format: "uri" }),

		SESSION_TTL: t.Number({ default: 60 * 60 * 3 }),
		BATCH_SIZE: t.Number({ default: 100 }),
		DEBOUNCE_MS: t.Number({ default: 100 }),
		MAX_BATCH_WAIT_MS: t.Number({ default: 500 }),

		S3_ENDPOINT: t.String({ format: "uri" }),
		S3_ACCESS_KEY: t.String(),
		S3_SECRET_KEY: t.String(),

		// Auth
		BASE_URL: t.String({ format: "uri" }),
		CAS_BASE_URL: t.String({
			format: "uri",
			default: "https://login.pens.ac.id",
		}),

		COOKIE_SECRET: t.String({ minLength: 32, maxLength: 64 }),

		// Labs
		GUACD_IP: t.Optional(t.String({ format: "ipv4" })),
		GUACD_HOST: t.String(),
		GUACD_PORT: t.Number({ default: 4822 }),
		GUACD_SECRET: t.String({ minLength: 32, maxLength: 64 }),

		CLAB_URL: t.String({ format: "uri" }),
		CLAB_HOST: t.Optional(t.String()),
		CLAB_USERNAME: t.String(),
		CLAB_PASSWORD: t.String(),
	},
	{ additionalProperties: false },
);

const validator = TypeCompiler.Compile(EnvSchema);
const value = Value.Default(EnvSchema, process.env);
const converted = Value.Convert(EnvSchema, value);
const casted = Value.Cast(EnvSchema, converted);
const errors = [...validator.Errors(casted)];

if (errors.length) {
	console.error("❌ Invalid environment variables:");
	for (const error of errors) {
		console.error(`- ${error.path} ${error.message}`);
	}
	process.exit(1);
}

const env = validator.Decode(casted);

export default env;
export const inProduction = env.NODE_ENV === "production";
export async function populateEnv() {
	if (!env.GUACD_IP) {
		const data = await dns.lookup(env.GUACD_HOST, { family: 4 });
		env.GUACD_IP = data.address;
	}

	if (!env.CLAB_HOST) {
		const clabUrl = new URL(env.CLAB_URL);
		env.CLAB_HOST = clabUrl.hostname;
	}
}
