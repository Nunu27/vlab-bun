import { inProduction } from "@backend/env";
import { Elysia } from "elysia";
import { helmet } from "elysia-helmet";

const security = new Elysia({ name: "security" }).use(
	helmet({ contentSecurityPolicy: inProduction ? undefined : false })
);

export default security;
