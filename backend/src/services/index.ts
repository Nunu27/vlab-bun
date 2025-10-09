import { wrap } from "@bogeychan/elysia-logger";
import { Elysia, t } from "elysia";
import db from "../db";
import logger from "./logger";
import session from "./session";

const services = new Elysia()
	.use(wrap(logger, { autoLogging: false }))
	.decorate("db", db)
	.use(session)
	.as("global");

export default services;
export type App = typeof services;
