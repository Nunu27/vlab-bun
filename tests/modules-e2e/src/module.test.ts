import { afterAll, beforeAll, describe, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { Containerlab } from "@vlab/clab";
import { createMonitor } from "@vlab/clab-monitor";
import evaluator from "@vlab/evaluator";
import type { NodeInfo, SessionCheckPayload } from "@vlab/evaluator/types";
import Docker from "dockerode";
import { RouterOSClient } from "mikro-routeros";
import { applyConfigurations } from "./configurator";
import type { DeployedNode } from "./context";
import { parseModule } from "./module-parser";
import { buildContainerlabTopology, getDeviceType } from "./topology-builder";

const DOCS_DIR = resolve(process.cwd(), "../../docs/modules");
const TOPOLOGIES_DIR = resolve(process.cwd(), "topologies");

// Filter to a specific module via env var:
//   VLAB_MODULE=3-konfigurasi-static-routing bun test
//   VLAB_MODULE=ospf bun test   (substring match)
const TARGET_MODULE = process.env.VLAB_MODULE;

const moduleDirs = readdirSync(DOCS_DIR)
	.filter((name) => (TARGET_MODULE ? name.includes(TARGET_MODULE) : true))
	.sort();

if (moduleDirs.length === 0) {
	throw new Error(
		`No modules found matching VLAB_MODULE="${TARGET_MODULE}" in ${DOCS_DIR}`,
	);
}

// Pre-parse all selected modules so describe/it blocks can be built synchronously.
const parsedModules = await Promise.all(
	moduleDirs.map((dir) => parseModule(join(DOCS_DIR, dir))),
);

const clab = new Containerlab({ topologiesPath: TOPOLOGIES_DIR });
const docker = new Docker();

// Single monitor shared across all module tests. No filter so it tracks all
// containerlab containers; buildResolvedData already rejects non-clab containers.
const monitor = createMonitor({
	logger: {
		info: () => {},
		error: () => {},
		debug: () => {},
		warn: () => {},
	},
	docker,
});

evaluator.setSourceRead("node-interface.interfaces-ip", (ctx) => {
	return monitor.interfaceMap.get(ctx.node.id) ?? {};
});

monitor.emitter.on("interface-update", (node, interfaces) => {
	evaluator.emitSource(node.id, "node-interface.interfaces-ip", interfaces);
});

await monitor.monitor.start();

// Timeouts per check category: convergence checks (OSPF/BGP) need more time.
function checkTimeout(checkId: string): number {
	if (
		checkId === "mikrotik.ospf-neighbor-exist" ||
		checkId === "mikrotik.bgp-session-established"
	) {
		return 120_000;
	}
	return 60_000;
}

for (const mod of parsedModules) {
	describe(`Module: ${mod.name}`, () => {
		const LAB_NAME = `mod-${randomUUID().slice(0, 6)}`;

		let session: ReturnType<typeof evaluator.createSession>;
		const mikrotikClients: Record<string, RouterOSClient> = {};
		let nodeMap: Record<string, DeployedNode> = {};

		// Track which checks have passed and resolve waiting promises.
		const checkPassed = new Set<string>();
		const checkResolvers: Record<string, () => void> = {};

		function waitForCheck(checkId: string, timeout: number): Promise<void> {
			if (checkPassed.has(checkId)) return Promise.resolve();
			return new Promise<void>((resolve, reject) => {
				const timer = setTimeout(
					() => reject(new Error(`Timeout waiting for check: ${checkId}`)),
					timeout,
				);
				checkResolvers[checkId] = () => {
					clearTimeout(timer);
					resolve();
				};
			});
		}

		beforeAll(async () => {
			// Build device type map from topology
			const deviceTypes: Record<string, "mikrotik" | "linux" | "unknown"> = {};
			for (const [name, device] of Object.entries(mod.topology.devices)) {
				deviceTypes[name] = getDeviceType(device.template);
			}

			// Deploy lab
			const clabTopo = buildContainerlabTopology(LAB_NAME, mod.topology);
			const inspectData = await clab.deploy(LAB_NAME, clabTopo);

			// Map container names → deployed node info
			nodeMap = {};
			for (const node of inspectData) {
				const nodeName = node.name.replace(`clab-${LAB_NAME}-`, "");
				nodeMap[nodeName] = {
					ip: node.ipv4Address?.split("/")[0] ?? "",
					containerId: node.containerId,
				};
			}

			// Wait for mikrotik nodes to become healthy before connecting clients
			const mikrotikNodes = Object.entries(mod.topology.devices)
				.filter(([, d]) => getDeviceType(d.template) === "mikrotik")
				.map(([name]) => name);

			const HEALTH_TIMEOUT = 300_000;
			await Promise.all(
				mikrotikNodes.map((nodeName) =>
					monitor.health.wait(nodeMap[nodeName]?.containerId ?? nodeName, {
						timeout: HEALTH_TIMEOUT,
					}),
				),
			);

			// Connect RouterOSClient per mikrotik node
			for (const nodeName of mikrotikNodes) {
				const info = nodeMap[nodeName];
				if (!info?.ip) {
					throw new Error(
						`Node ${nodeName} has no IP address after deployment`,
					);
				}

				const client = new RouterOSClient(info.ip);
				for (let attempt = 0; attempt < 5; attempt++) {
					try {
						await client.connect();
						await client.login("admin", "admin");
						break;
					} catch (err) {
						if (attempt === 4) throw err;
						await new Promise((r) => setTimeout(r, 5000));
					}
				}
				mikrotikClients[nodeName] = client;
			}

			// Build the evaluator check list from parsed module checks. The
			// evaluator session operates in Docker container-ID space (matching
			// clab-monitor's NodeInfo.id), so translate each check's human-readable
			// target node into its container ID.
			const sessionChecks = mod.checks.map((check) => ({
				id: check.id,
				nodeId: nodeMap[check.targetNode]?.containerId ?? check.targetNode,
				checkId: check.checkId as SessionCheckPayload<
					typeof evaluator.handlers
				>["checkId"],
				params: check.params as SessionCheckPayload<
					typeof evaluator.handlers
				>["params"],
			})) as SessionCheckPayload<typeof evaluator.handlers>[];

			const evalNodeMap: Record<string, NodeInfo> = {};
			for (const info of Object.values(nodeMap)) {
				evalNodeMap[info.containerId] = { id: info.containerId, ip: info.ip };
			}

			// Create the evaluator session
			session = evaluator.createSession(docker, evalNodeMap, sessionChecks, {
				isNodeHealthy: monitor.health.isHealthy,
				waitForHealth: (nodeId, timeoutMs, signal) =>
					monitor.health.wait(nodeId, { timeout: timeoutMs, signal }),
			});

			session.onChange((id, value) => {
				if (value) {
					checkPassed.add(id);
					checkResolvers[id]?.();
					delete checkResolvers[id];
				} else {
					checkPassed.delete(id);
				}
			});

			await session.start();

			// Apply all configurations derived from the module's checks
			await applyConfigurations(
				mikrotikClients,
				docker,
				nodeMap,
				deviceTypes,
				mod.checks,
				mod.topology,
			);

			// Force an immediate evaluation cycle so checks that already pass
			// (e.g. IP address was configured synchronously) are picked up.
			await session.check();
		}, 600_000);

		afterAll(async () => {
			if (session) await session.stop();
			for (const client of Object.values(mikrotikClients)) {
				client.close();
			}
			await clab.destroy(LAB_NAME, { graceful: false });
		}, 60_000);

		// One it-block per check for granular pass/fail reporting
		for (const check of mod.checks) {
			const timeout = checkTimeout(check.checkId);
			it(
				`${check.targetNode}: ${check.checkId} ${JSON.stringify(check.params)}`,
				() => waitForCheck(check.id, timeout),
				timeout + 5_000,
			);
		}
	});
}
