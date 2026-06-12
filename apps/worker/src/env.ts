import "dotenv/config";

import { promises as dns } from "node:dns";
import { Type as t } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Value } from "@sinclair/typebox/value";

const EnvSchema = t.Object({
	NODE_ENV: t.Union(
		[t.Literal("development"), t.Literal("production"), t.Literal("test")],
		{ default: "development" },
	),
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

	WORKER_ID: t.String({ minLength: 1 }),
	MANAGER_GRPC_URL: t.String({ default: "localhost:50051" }),
	GUACD_HOST: t.String(),
	// GUACD_IP will be automatically inferred from GUACD_HOST if not provided
	GUACD_IP: t.String({ default: "" }),

	CLAB_CLI_PATH: t.String({ default: "containerlab" }),
	CLAB_TOPOLOGIES_PATH: t.String({ default: "/var/lib/vlab/topologies" }),
	CLAB_MGMT_NETWORK: t.String({ default: "clab-mgmt" }),
});

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

if (!env.GUACD_IP) {
	const { address } = await dns.lookup(env.GUACD_HOST).catch(() => {
		console.error(
			`❌ GUACD_HOST Failed to resolve '${env.GUACD_HOST}' hostname`,
		);
		process.exit(1);
	});
	env.GUACD_IP = address;
}

export default env;
export const inProduction = env.NODE_ENV === "production";
