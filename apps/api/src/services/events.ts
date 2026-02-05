import { EventEmitter } from "node:events";
import env from "@api/env";
import type { TempNodeEvents } from "@api/types/clab";
import type { TypedEventEmitter } from "@api/types/events";
import { createMonitor } from "@vlab/clab-monitor";
import docker from "./docker";
import logger from "./logger";

const CLAB_HOST = new URL(env.CLAB_URL).hostname;

export const clabMonitor = createMonitor({
	host: CLAB_HOST,
	logger: logger.child({ service: "monitor" }),
	docker,
});

export const tempNodeEvents =
	new EventEmitter() as TypedEventEmitter<TempNodeEvents>;
