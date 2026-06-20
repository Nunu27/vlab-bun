import type { NodeInfo } from "@vlab/evaluator/types";
import type Docker from "dockerode";
import type { RouterOSClient } from "mikro-routeros";

export interface ModuleTestContext {
	mikrotikClients: Record<string, RouterOSClient>;
	nodeMap: Record<string, NodeInfo>;
	docker: Docker;
	waitForCheck: (checkId: string, timeout?: number) => Promise<void>;
}
