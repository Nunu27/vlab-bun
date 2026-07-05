import type Docker from "dockerode";
import type { RouterOSClient } from "mikro-routeros";

// Deployed node bookkeeping local to these tests, keyed by human topology
// node name. Distinct from evaluator's NodeInfo, which is keyed and
// identified by container ID.
export interface DeployedNode {
	ip: string;
	containerId: string;
}

export interface TestContext {
	router1Client: RouterOSClient;
	router2Client: RouterOSClient;
	nodeMap: Record<string, DeployedNode>;
	docker: Docker;
	waitForCheck: (checkId: string, timeout?: number) => Promise<void>;
}
