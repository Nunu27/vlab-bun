import "dotenv/config";

import { Type as t, Static } from "typebox";
import Value from "typebox/value";

const EnvSchema = t.Object({
	NODE_ENV: t.Union([
		t.Literal("development"),
		t.Literal("production"),
		t.Literal("test")
	]),

	PORT: t.Number({ default: 3000 }),

	DATABASE_URL: t.String({ format: "uri" }),
	REDIS_URL: t.String({ format: "uri" }),

	SESSION_TTL: t.Number({ default: 60 * 60 * 3 }),
	BATCH_SIZE: t.Number({ default: 100 }),
	DEBOUNCE_MS: t.Number({ default: 100 }),
	MAX_BATCH_WAIT_MS: t.Number({ default: 500 }),

	BASE_URL: t.String({ format: "uri" }),
	CAS_BASE_URL: t.String({ format: "uri" })
});

const env = Value.Parse(EnvSchema, process.env);

export default env;
export type Env = Static<typeof EnvSchema>;
export const inProduction = env.NODE_ENV === "production";
