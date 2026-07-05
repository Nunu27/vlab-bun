import { createMonitor } from "@vlab/clab-monitor";
import docker from "./docker";
import baseLogger from "./logger";

const logger = baseLogger.child({ service: "clab-monitor" });

export const monitor = createMonitor({ logger, docker });
