import { inProduction } from "@backend/env";
import { formatters, serializers } from "@bogeychan/elysia-logger";
import { pino } from "pino";

const logger = pino({
	formatters,
	serializers,
	level: inProduction ? "info" : "debug"
});

export default logger;
export function childLogger(service: string) {
	return logger.child({}, { msgPrefix: `[${service}] ` });
}
