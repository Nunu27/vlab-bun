import { formatters, serializers } from "@bogeychan/elysia-logger";
import { pino } from "pino";

export default pino({ serializers, formatters });
