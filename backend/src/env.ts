import "dotenv/config";

import Type from "typebox";
import Value from "typebox/value";

const EnvSchema = Type.Object({
	NODE_ENV: Type.Union([
		Type.Literal("development"),
		Type.Literal("production"),
		Type.Literal("test")
	]),

	PORT: Type.Number({ default: 3000 }),

	DATABASE_URL: Type.String({ format: "uri" }),
	REDIS_URL: Type.String({ format: "uri" }),

	SESSION_TTL: Type.Number({ default: 60 * 60 * 3 }),
	BATCH_SIZE: Type.Number({ default: 100 }),
	DEBOUNCE_MS: Type.Number({ default: 100 }),
	MAX_BATCH_WAIT_MS: Type.Number({ default: 500 })
});

const env = Value.Parse(EnvSchema, process.env);

export default env;
export type Env = Type.Static<typeof EnvSchema>;
export const inProduction = env.NODE_ENV === "production";
