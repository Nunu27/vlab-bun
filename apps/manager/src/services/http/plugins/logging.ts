import { wrap } from "@bogeychan/elysia-logger";
import logger from "@manager/lib/logger";
import { Elysia } from "elysia";

const logging = new Elysia({ name: "logging" }).use(wrap(logger));

export default logging;
