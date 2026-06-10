import "dotenv/config";

import { promises as dns } from "node:dns";
import { Type as t } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Value } from "@sinclair/typebox/value";

let defaultGuacdIp = "172.17.0.1";
try {
	const res = await dns.lookup("guacd");
	defaultGuacdIp = res.address;
} catch {}

const EnvSchema = t.Object({
	NODE_ENV: t.Union(
		[t.Literal("development"), t.Literal("production"), t.Literal("test")],
		{ default: "development" },
	),

	WORKER_ID: t.String({ minLength: 1 }),
	MANAGER_GRPC_URL: t.String({ default: "localhost:50051" }),
	GUACD_IP: t.String({ default: defaultGuacdIp }),
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

export default env;
export const inProduction = env.NODE_ENV === "production";
