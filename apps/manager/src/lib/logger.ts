import { formatters, serializers } from "@bogeychan/elysia-logger";
import { pino } from "pino";
import env from "../env";

const logger = pino({
	formatters,
	serializers,
	level: env.LOG_LEVEL,
	base: { service: "system" },
});

export default logger;
