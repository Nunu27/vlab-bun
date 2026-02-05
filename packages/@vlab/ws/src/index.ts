import { WSContracts } from "@jawit/ws";
import deviceTemplate from "./device-template";
import labSession from "./lab-session";
import type { WSMeta } from "./types";

export default new WSContracts<WSMeta>().use(deviceTemplate).use(labSession);
