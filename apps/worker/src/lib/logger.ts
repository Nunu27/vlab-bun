import { pino } from "pino";
import env from "../env";

const baseLogger = pino({
	level: env.LOG_LEVEL,
	base: { service: "system" },
});

export default baseLogger;
