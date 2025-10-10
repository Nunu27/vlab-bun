import { name, version } from "@/../package.json";
import db from "@/db";
import { wrap } from "@bogeychan/elysia-logger";
import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import logger from "./logger";
import session from "./session";

const services = new Elysia()
	.use(wrap(logger, { autoLogging: false }))
	.use(
		openapi({
			documentation: {
				info: { title: name, version }
			}
		})
	)
	.decorate("db", db)
	.use(session)
	.as("global");

export default services;
export type AppWithServices = typeof services;
