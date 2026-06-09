import openapi, { fromTypes } from "@elysiajs/openapi";
import { name, version } from "@manager/../package.json";
import env from "@manager/env";
import { Elysia } from "elysia";
import { isProduction } from "elysia/error";

const documentation = new Elysia({ name: "documentation" })
	.onAfterHandle(({ set }) => {
		if (env.ENABLE_OPENAPI) set.headers["content-security-policy"] = "";
	})
	.use(
		openapi({
			path: "/docs",
			enabled: env.ENABLE_OPENAPI,
			references: fromTypes(isProduction ? "dist/index.d.ts" : "src/index.ts"),
			documentation: { info: { title: name, version } },
		}),
	);

export default documentation;
