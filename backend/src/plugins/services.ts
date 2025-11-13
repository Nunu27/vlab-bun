import db from "@backend/db";
import caching from "@backend/middlewares/caching";
import session from "@backend/middlewares/session";
import documentation from "@backend/plugins/documentation";
import errorHandler from "@backend/plugins/error-handler";
import fallback from "@backend/plugins/fallback";
import logging from "@backend/plugins/logging";
import security from "@backend/plugins/security";
import redis from "@backend/services/redis";
import { Elysia, type ElysiaConfig } from "elysia";

const services = new Elysia({ name: "services" })
	.use(security)
	.use(logging)
	.use(documentation)
	.use(fallback)
	.use(errorHandler)
	.decorate("redis", redis)
	.decorate("db", db)
	.use(session)
	.use(caching)
	.as("global");

export default services;
export const createRouter = <Prefix extends string = "">(
	config?: ElysiaConfig<Prefix>
) => new Elysia(config).use(services);
