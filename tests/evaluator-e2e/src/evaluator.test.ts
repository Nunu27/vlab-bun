import { afterAll, beforeAll, describe } from "bun:test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import type { ContainerlabTopologyDefinition } from "@vlab/clab";
import { Containerlab } from "@vlab/clab";
import { createMonitor } from "@vlab/clab-monitor";
import evaluator from "@vlab/evaluator";
import type { NodeInfo, SessionCheckPayload } from "@vlab/evaluator/types";
import Docker from "dockerode";
import { RouterOSClient } from "mikro-routeros";
import type { DeployedNode, TestContext } from "./context";
import { testLinux } from "./suites/linux";
import { testMikrotik } from "./suites/mikrotik";
import { testNodeInterface } from "./suites/node-interface";

const LAB_NAME = `eval-e2e-${randomUUID().slice(0, 6)}`;

const topo: ContainerlabTopologyDefinition = {
	name: LAB_NAME,
	topology: {
		nodes: {
			router1: {
				kind: "mikrotik_ros",
				image: "ghcr.io/nunu27/vrnetlab/vr-routeros",
			},
			router2: {
				kind: "mikrotik_ros",
				image: "ghcr.io/nunu27/vrnetlab/vr-routeros",
			},
			linux1: {
				kind: "linux",
				image: "ghcr.io/nunu27/docker-remote-desktop:ssh-ubuntu-24.04",
				stages: {
					create: {
						"wait-for": [
							{ node: "router1", stage: "healthy" },
							{ node: "router2", stage: "healthy" },
						],
					},
				},
			},
		},
		links: [
			{ endpoints: ["router1:ether2", "router2:ether2"] },
			{ endpoints: ["router1:ether3", "linux1:eth1"] },
		],
	},
};

const clab = new Containerlab({
	topologiesPath: resolve(process.cwd(), "topologies"),
});
const docker = new Docker();

let session: ReturnType<typeof evaluator.createSession>;
const nodeMap: Record<string, DeployedNode> = {};

let router1Client: RouterOSClient;
let router2Client: RouterOSClient;

const clabMonitor = createMonitor({
	logger: {
		info: () => {},
		error: () => {},
		debug: () => {},
		warn: () => {},
	},
	docker,
});

// Add node interface read override
evaluator.setSourceRead("node-interface.interfaces-ip", (ctx) => {
	return clabMonitor.interfaceMap.get(ctx.node.id) || {};
});

const checks: SessionCheckPayload<typeof evaluator.handlers>[] = [
	// Linux Checks
	{
		id: "linux1-route-exist",
		nodeId: "linux1",
		checkId: "linux.route-exist",
		params: { dst: "192.168.100.0/24", gateway: "10.0.1.1" },
	},
	{
		id: "linux1-user-exist",
		nodeId: "linux1",
		checkId: "linux.user-exist",
		params: { username: "vlabtester" },
	},
	{
		id: "linux1-check-ip",
		nodeId: "linux1",
		checkId: "node-interface.check-ip",
		params: { interface: "eth1", ip: "10.0.1.3/24" },
	},
	// Mikrotik Checks
	{
		id: "router1-route-exist",
		nodeId: "router1",
		checkId: "mikrotik.route-exist",
		params: { dst: "172.16.0.0/24", gateway: "10.0.0.2", flag: "As" },
	},
	{
		id: "router1-ospf-instance",
		nodeId: "router1",
		checkId: "mikrotik.ospf-instance-exist",
		params: { name: "vlab-ospf", version: "2", routerId: "1.1.1.1", flag: "" },
	},
	{
		id: "router1-ospf-area",
		nodeId: "router1",
		checkId: "mikrotik.ospf-area-exist",
		params: {
			name: "backbone",
			instance: "vlab-ospf",
			areaId: "0.0.0.0",
			flag: "",
		},
	},
	{
		id: "router1-ospf-template",
		nodeId: "router1",
		checkId: "mikrotik.ospf-interface-template-exist",
		params: { interfaces: "ether1", area: "backbone", flag: "" },
	},
	{
		id: "router1-rip-instance",
		nodeId: "router1",
		checkId: "mikrotik.rip-instance-exist",
		params: { name: "vlab-rip", flag: "" },
	},
	{
		id: "router1-rip-template",
		nodeId: "router1",
		checkId: "mikrotik.rip-interface-template-exist",
		params: { interfaces: "ether1", instance: "vlab-rip", flag: "" },
	},
	{
		id: "router1-bgp-instance",
		nodeId: "router1",
		checkId: "mikrotik.bgp-instance-exist",
		params: { name: "vlab-bgp", as: "65000", routerId: "1.1.1.1", flag: "" },
	},
	{
		id: "router1-system-identity",
		nodeId: "router1",
		checkId: "mikrotik.system-identity",
		params: { name: "VLabRouter" },
	},
	{
		id: "router1-user-exist",
		nodeId: "router1",
		checkId: "mikrotik.user-exist",
		params: { username: "vlabtester" },
	},
	{
		id: "router1-check-ip",
		nodeId: "router1",
		checkId: "node-interface.check-ip",
		params: { interface: "ether2", ip: "10.0.0.1/24" },
	},
	{
		id: "router1-ospf-neighbor",
		nodeId: "router1",
		checkId: "mikrotik.ospf-neighbor-exist",
		params: { interface: "ether2", state: "Full" },
	},
	{
		id: "router1-bgp-connection",
		nodeId: "router1",
		checkId: "mikrotik.bgp-connection-exist",
		params: { name: "vlab-bgp-to-r2", "remote.as": "65001" },
	},
	{
		id: "router1-bgp-session",
		nodeId: "router1",
		checkId: "mikrotik.bgp-session-established",
		params: { "remote.address": "10.0.0.2" },
	},
];

const checkPromises: Record<string, () => void> = {};

async function connectWithRetry(
	client: RouterOSClient,
	retries = 5,
	delay = 5000,
) {
	for (let i = 0; i < retries; i++) {
		try {
			await client.connect();
			return;
		} catch (error) {
			console.warn(`Connection failed: ${error}. Retrying in ${delay}ms...`);
			if (i === retries - 1) throw error;
			await new Promise((res) => setTimeout(res, delay));
		}
	}
}

function waitForCheck(checkId: string, timeout = 30000) {
	const startTime = performance.now();
	return new Promise<void>((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Timeout waiting for check: ${checkId}`));
		}, timeout);
		checkPromises[checkId] = () => {
			clearTimeout(timer);
			const duration = (performance.now() - startTime).toFixed(2);
			console.log(`Check passed: ${checkId} [${duration}ms]`);
			resolve();
		};
	});
}

describe("Evaluator E2E", () => {
	beforeAll(async () => {
		await clabMonitor.monitor.start();

		const inspectData = await clab.deploy(LAB_NAME, topo);

		for (const node of inspectData) {
			const nodeName = node.name.replace(`clab-${LAB_NAME}-`, "");
			nodeMap[nodeName] = {
				ip: node.ipv4Address?.split("/")[0] || "",
				containerId: node.containerId,
			};
		}

		const expectedNodes = ["router1", "router2", "linux1"];
		for (const expected of expectedNodes) {
			if (!nodeMap[expected]?.ip) {
				throw new Error(
					`Deployment failed: Node ${expected} is missing or has no IP address.`,
				);
			}
		}

		await clabMonitor.health.wait(nodeMap.router1?.containerId ?? "router1");
		await clabMonitor.health.wait(nodeMap.router2?.containerId ?? "router2");
		await clabMonitor.health.wait(nodeMap.linux1?.containerId ?? "linux1");

		router1Client = new RouterOSClient(nodeMap.router1?.ip || "");
		await connectWithRetry(router1Client);
		await router1Client.login("admin", "admin");

		router2Client = new RouterOSClient(nodeMap.router2?.ip || "");
		await connectWithRetry(router2Client);
		await router2Client.login("admin", "admin");

		clabMonitor.emitter.on("interface-update", (node, interfaces) => {
			evaluator.emitSource(node.id, "node-interface.interfaces-ip", interfaces);
		});

		const evalNodeMap: Record<string, NodeInfo> = {};
		for (const info of Object.values(nodeMap)) {
			evalNodeMap[info.containerId] = { id: info.containerId, ip: info.ip };
		}
		const sessionChecks = checks.map((check) => ({
			...check,
			nodeId: nodeMap[check.nodeId]?.containerId ?? check.nodeId,
		}));

		session = evaluator.createSession(docker, evalNodeMap, sessionChecks, {
			isNodeHealthy: clabMonitor.health.isHealthy,
			waitForHealth: (nodeId, timeoutMs, signal) =>
				clabMonitor.health.wait(nodeId, { timeout: timeoutMs, signal }),
		});

		session.onChange((id, value) => {
			if (value && checkPromises[id]) {
				checkPromises[id]();
				delete checkPromises[id]; // Prevent calling multiple times
			}
		});

		await session.start();
		await session.check(); // Run initial checks
	}, 180_000);

	afterAll(async () => {
		if (session) await session.stop();
		if (router1Client) router1Client.close();
		if (router2Client) router2Client.close();
		await clab.destroy(LAB_NAME, { graceful: false });
	}, 60_000);

	const getCtx = (): TestContext => ({
		router1Client,
		router2Client,
		nodeMap,
		docker,
		waitForCheck,
	});

	testNodeInterface(getCtx);
	testMikrotik(getCtx);
	testLinux(getCtx);
});
