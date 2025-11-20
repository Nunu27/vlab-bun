import db from "@backend/db";
import env from "@backend/env";
import caching from "@backend/middlewares/caching";
import session from "@backend/middlewares/session";
import documentation from "@backend/plugins/documentation";
import errorHandler from "@backend/plugins/error-handler";
import fallback from "@backend/plugins/fallback";
import logging from "@backend/plugins/logging";
import security from "@backend/plugins/security";
import clab from "@backend/services/clab";
import redis from "@backend/services/redis";
import storage from "@backend/services/storage";
import { Elysia, type ElysiaConfig } from "elysia";

const services = new Elysia({ name: "services" })
	.use(security)
	.use(logging)
	.use(documentation)
	.use(fallback)
	.use(errorHandler)
	.decorate("bucket", env.S3_BUCKET_NAME)
	.decorate("storage", storage)
	.decorate("redis", redis)
	.decorate("clab", clab)
	.decorate("db", db)
	.use(session)
	.use(caching)
	.as("global");

export default services;
export const createRouter = <Prefix extends string = "">(
	config?: ElysiaConfig<Prefix>
) => new Elysia(config).use(services);
