import "dotenv/config";

import { Type as t, Static } from "typebox";
import Value from "typebox/value";

const EnvSchema = t.Object({
	// System
	NODE_ENV: t.Union([
		t.Literal("development"),
		t.Literal("production"),
		t.Literal("test")
	]),

	PORT: t.Number({ default: 3000 }),
	DISPLAY_PORT: t.Number({ default: 8080 }),

	DATABASE_URL: t.String({ format: "uri" }),
	REDIS_URL: t.String({ format: "uri" }),

	SESSION_TTL: t.Number({ default: 60 * 60 * 3 }),
	BATCH_SIZE: t.Number({ default: 100 }),
	DEBOUNCE_MS: t.Number({ default: 100 }),
	MAX_BATCH_WAIT_MS: t.Number({ default: 500 }),

	S3_HOST: t.String(),
	S3_PORT: t.Number({ default: 9000 }),
	S3_ACCESS_KEY: t.String(),
	S3_SECRET_KEY: t.String(),
	S3_BUCKET_NAME: t.String(),

	// Auth
	BASE_URL: t.String({ format: "uri" }),
	CAS_BASE_URL: t.String({ format: "uri" }),

	COOKIE_SECRET: t.String({ minLength: 32, maxLength: 64 }),

	// Labs
	GUACD_HOST: t.String(),
	GUACD_PORT: t.Number({ default: 4822 }),
	GUACD_SECRET: t.String({ minLength: 32, maxLength: 64 }),

	CLAB_HOST: t.String(),
	CLAB_USERNAME: t.String(),
	CLAB_PASSWORD: t.String()
});

const env = Value.Parse(EnvSchema, process.env);

export default env;
export type Env = Static<typeof EnvSchema>;
export const inProduction = env.NODE_ENV === "production";
