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
	BATCH_SIZE: Type.Number({ default: 100 })
});

export type Env = Type.Static<typeof EnvSchema>;
export default Value.Parse(EnvSchema, process.env);
