import { failure } from "@jawit/common";
import { file } from "bun";
import { Elysia } from "elysia";

const fallback = new Elysia({ name: "fallback" })
	.all(
		"*",
		({ path, status }) => {
			return status(
				200,
				file(
					path === "/favicon.ico" ? "public/favicon.ico" : "public/index.html",
				),
			);
		},
		{
			detail: { hide: true },
		},
	)
	.all(
		"/api/*",
		({ status }) => status(404, failure({ message: "Resource not found" })),
		{ detail: { hide: true } },
	);

export default fallback;
