import "dotenv/config";

import { Static, t } from "elysia";
import { Value } from "@sinclair/typebox/value";

const EnvSchema = t.Object({
	NODE_ENV: t.Union([
		t.Literal("development"),
		t.Literal("production"),
		t.Literal("test")
	]),

	PORT: t.Optional(t.Number({ default: 3000 })),

	DATABASE_URL: t.String({ format: "uri" }),
	REDIS_URL: t.String({ format: "uri" }),

	SESSION_TTL: t.Optional(t.Number({ default: 60 * 60 * 3 })),
	BATCH_SIZE: t.Optional(t.Number({ default: 100 }))
});

export type Env = Static<typeof EnvSchema>;
export default Value.Parse(EnvSchema, process.env);
