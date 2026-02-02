import { formatters, serializers } from "@bogeychan/elysia-logger";
import { pino } from "pino";
import { inProduction } from "../env";

const logger = pino({
	formatters,
	serializers,
	level: inProduction ? "info" : "debug",
});

export default logger;
