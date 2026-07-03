import { Elysia } from "elysia";
import { helmet } from "elysia-helmet";

const security = new Elysia({ name: "security" }).use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				"frame-src": ["'self'", "https://www.youtube.com"],
			},
		},
	}),
);

export default security;
