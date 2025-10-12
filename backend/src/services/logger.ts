import env from "@/env";
import { formatters, serializers } from "@bogeychan/elysia-logger";
import { pino } from "pino";

const inProduction = env.NODE_ENV === "production";

export default pino({
	serializers,
	formatters,
	level: inProduction ? "info" : "debug"
});
