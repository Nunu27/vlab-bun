import { createMonitor } from "@vlab/clab-monitor";
import baseLogger from "@worker/lib/logger";
import { LABELS } from "./constants";
import docker from "./docker";

const logger = baseLogger.child({ service: "monitor" });

export const clabMonitor = createMonitor({
	logger: logger,
	docker,
	nodeIdLabel: LABELS.SESSION_NODE_ID,
});
