import "./utils/validation";
import "dotenv/config";

import { Type, Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const EnvSchema = Type.Object({
	NODE_ENV: Type.Union([
		Type.Literal("development"),
		Type.Literal("production"),
		Type.Literal("test")
	]),
	PORT: Type.Number({ default: 3000 }),
	DATABASE_URL: Type.String({ format: "uri" }),
	REDIS_URL: Type.String({ format: "uri" }),
	BATCH_SIZE: Type.Number({ default: 100 })
});

export type Env = Static<typeof EnvSchema>;
export default Value.Parse(EnvSchema, process.env);
