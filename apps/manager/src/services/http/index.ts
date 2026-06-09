import staticPlugin from "@elysiajs/static";
import env, { inProduction } from "@manager/env";
import { Elysia } from "elysia";
import documentation from "./plugins/documentation";
import errorHandler from "./plugins/error-handler";
import fallback from "./plugins/fallback";
import logging from "./plugins/logging";
import security from "./plugins/security";
import routes from "./routes";

const httpHandler = new Elysia({
	cookie: { secrets: env.COOKIE_SECRET, secure: inProduction },
})
	.use(logging)
	.use(security)
	.use(documentation)
	.use(errorHandler)
	.use(fallback)
	.use(routes)
	.use(
		inProduction
			? staticPlugin({
					prefix: "/assets",
					assets: "public/assets",
				})
			: undefined,
	);

export default httpHandler;
