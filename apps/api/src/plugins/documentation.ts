import { name, version } from "@api/../package.json";
import env from "@api/env";
import openapi, { fromTypes } from "@elysiajs/openapi";
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
