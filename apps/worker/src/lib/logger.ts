import { pino } from "pino";
import { inProduction } from "../env";

const baseLogger = pino({
	level: inProduction ? "info" : "debug",
	base: { service: "system" },
});

export default baseLogger;
