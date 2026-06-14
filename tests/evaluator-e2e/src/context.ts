import type { NodeInfo } from "@vlab/evaluator/types";
import type Docker from "dockerode";
import type { RouterOSClient } from "mikro-routeros";

export interface TestContext {
	router1Client: RouterOSClient;
	router2Client: RouterOSClient;
	nodeMap: Record<string, NodeInfo>;
	docker: Docker;
	waitForCheck: (checkId: string, timeout?: number) => Promise<void>;
}
