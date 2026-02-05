import logger from "@api/services/logger";
import { wrap } from "@bogeychan/elysia-logger";
import { Elysia } from "elysia";

const logging = new Elysia({ name: "logging" }).use(wrap(logger));

export default logging;
