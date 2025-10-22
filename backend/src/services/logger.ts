import { inProduction } from "@/env";
import { formatters, serializers } from "@bogeychan/elysia-logger";
import { pino } from "pino";

export default pino({
	serializers,
	formatters,
	level: inProduction ? "info" : "debug"
});
