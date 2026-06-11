import "dotenv/config";

import dns from "node:dns/promises";
import { Value } from "@sinclair/typebox/value";
import { TypeCompiler, t } from "elysia/type-system";

const EnvSchema = t.Object(
	{
		// System
		MANAGER_ID: t.String({ minLength: 1 }),
		NODE_ENV: t.Union([
			t.Literal("development"),
			t.Literal("production"),
			t.Literal("test"),
		]),
		LOG_LEVEL: t.Union(
			[
				t.Literal("fatal"),
				t.Literal("error"),
				t.Literal("warn"),
				t.Literal("info"),
				t.Literal("debug"),
				t.Literal("trace"),
			],
			{ default: "info" },
		),

		ENABLE_OPENAPI: t.Boolean({ default: false }),

		PORT: t.Number({ default: 3000 }),
		GRPC_PORT: t.Number({ default: 50051 }),
		DISPLAY_PORT: t.Number({ default: 8080 }),

		DATABASE_URL: t.String({ format: "uri" }),
		REDIS_URL: t.String({ format: "uri" }),

		SESSION_TTL: t.Number({ default: 60 * 60 * 3 }),

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
		// GUACD_IP will be automatically inferred from GUACD_HOST if not provided
		GUACD_IP: t.String({ default: "" }),
		GUACD_HOST: t.String(),
		GUACD_PORT: t.Number({ default: 4822 }),
		GUACD_SECRET: t.String({ minLength: 32, maxLength: 64 }),
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
}
