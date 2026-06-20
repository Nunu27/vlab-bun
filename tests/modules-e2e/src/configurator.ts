import type { NodeInfo } from "@vlab/evaluator/types";
import type Docker from "dockerode";
import type { RouterOSClient } from "mikro-routeros";
import type { ParsedCheck, TopologyMarkdown } from "./module-parser";

type DeviceTypes = Record<string, "mikrotik" | "linux" | "unknown">;

function getNetworkAddress(cidr: string): string {
	const slashIdx = cidr.indexOf("/");
	const ip = slashIdx >= 0 ? cidr.slice(0, slashIdx) : cidr;
	const prefix = slashIdx >= 0 ? parseInt(cidr.slice(slashIdx + 1), 10) : 24;
	const parts = ip.split(".").map(Number);
	const o0 = parts[0] ?? 0;
	const o1 = parts[1] ?? 0;
	const o2 = parts[2] ?? 0;
	const o3 = parts[3] ?? 0;
	const ipInt = ((o0 << 24) | (o1 << 16) | (o2 << 8) | o3) >>> 0;
	const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
	const netInt = (ipInt & mask) >>> 0;
	return `${(netInt >>> 24) & 0xff}.${(netInt >>> 16) & 0xff}.${(netInt >>> 8) & 0xff}.${netInt & 0xff}/${prefix}`;
}

// Returns the IP of the remote node on the shared link with localNode.
// Used to derive remote.address for BGP connections.
function getRemoteNodeIp(
	localNode: string,
	remoteNode: string,
	topology: TopologyMarkdown,
	nodeIpsByInterface: Map<string, Map<string, string>>,
): string | null {
	for (const link of topology.links) {
		if (link.from === localNode && link.to === remoteNode) {
			return (
				nodeIpsByInterface.get(remoteNode)?.get(link.remoteInterface) ?? null
			);
		}
		if (link.to === localNode && link.from === remoteNode) {
			return nodeIpsByInterface.get(remoteNode)?.get(link.interface) ?? null;
		}
	}
	return null;
}

async function execInContainer(
	docker: Docker,
	containerId: string,
	cmd: string[],
): Promise<void> {
	const container = docker.getContainer(containerId);
	const exec = await container.exec({
		Cmd: cmd,
		AttachStdout: true,
		AttachStderr: true,
	});

	// Detach:false waits for the command to finish before returning, preventing
	// race conditions (e.g. ip route add running before ip addr add completes).
	// stream.resume() drains the multiplexed Docker stream so "end" fires.
	const stream = await exec.start({ Detach: false, Tty: false });
	await new Promise<void>((resolve, reject) => {
		stream.resume();
		stream.on("end", resolve);
		stream.on("error", reject);
	});
}

async function applyMikrotikCheck(
	client: RouterOSClient,
	check: ParsedCheck,
	nodeName: string,
	nodeByAs: Map<string, string>,
	bgpInstanceByNode: Map<string, string>,
	topology: TopologyMarkdown,
	nodeIpsByInterface: Map<string, Map<string, string>>,
	nodeLanNetworks: Map<string, string[]>,
): Promise<void> {
	const p = check.params;

	const ignore = () => {};

	switch (check.checkId) {
		case "node-interface.check-ip": {
			await client
				.runQuery("/ip/address/add", {
					address: p.ip ?? "",
					interface: p.interface ?? "",
				})
				.catch(ignore);
			break;
		}

		case "mikrotik.system-identity": {
			await client.runQuery("/system/identity/set", { name: p.name ?? "" });
			break;
		}

		case "mikrotik.user-exist": {
			await client
				.runQuery("/user/add", {
					name: p.username ?? "",
					group: "read",
					password: "password123",
				})
				.catch(ignore);
			break;
		}

		case "mikrotik.route-exist": {
			// Only create static routes (those with an explicit gateway).
			// Routes with only a flag (DAr, DAo, DAb) are dynamic convergence checks.
			if (p.gateway) {
				await client
					.runQuery("/ip/route/add", {
						"dst-address": p.dst ?? "",
						gateway: p.gateway,
					})
					.catch(ignore);
			}
			break;
		}

		case "mikrotik.rip-instance-exist": {
			const args: Record<string, string> = { name: p.name ?? "" };
			if (p.redistribute) args.redistribute = p.redistribute;
			await client.runQuery("/routing/rip/instance/add", args).catch(ignore);
			break;
		}

		case "mikrotik.rip-interface-template-exist": {
			await client
				.runQuery("/routing/rip/interface-template/add", {
					instance: p.instance ?? "",
					interfaces: p.interfaces ?? "",
				})
				.catch(ignore);
			break;
		}

		case "mikrotik.ospf-instance-exist": {
			const args: Record<string, string> = {
				name: p.name ?? "",
				"router-id": p.routerId ?? "",
			};
			if (p.version) args.version = p.version;
			await client.runQuery("/routing/ospf/instance/add", args).catch(ignore);
			break;
		}

		case "mikrotik.ospf-area-exist": {
			await client
				.runQuery("/routing/ospf/area/add", {
					name: p.name ?? "",
					instance: p.instance ?? "",
					"area-id": p.areaId ?? "",
				})
				.catch(ignore);
			break;
		}

		case "mikrotik.ospf-interface-template-exist": {
			const args: Record<string, string> = {
				area: p.area ?? "",
				interfaces: p.interfaces ?? "",
			};
			if (p.type) args.type = p.type;
			if (p.passive) args.passive = p.passive;
			await client
				.runQuery("/routing/ospf/interface-template/add", args)
				.catch(ignore);
			break;
		}

		case "mikrotik.bgp-instance-exist": {
			await client
				.runQuery("/routing/bgp/instance/add", {
					name: p.name ?? "",
					as: p.as ?? "",
					"router-id": p.routerId ?? "",
				})
				.catch(ignore);
			break;
		}

		case "mikrotik.bgp-connection-exist": {
			// Derive the remote node by matching AS number
			const remoteAs = p["remote.as"] ?? "";
			const remoteNode = nodeByAs.get(remoteAs);
			if (!remoteNode) {
				console.warn(
					`BGP connection on ${nodeName}: no node found with AS ${remoteAs}`,
				);
				break;
			}

			// Find the IP of the remote node on the shared link
			const remoteAddress = getRemoteNodeIp(
				nodeName,
				remoteNode,
				topology,
				nodeIpsByInterface,
			);
			if (!remoteAddress) {
				console.warn(
					`BGP connection on ${nodeName}: could not determine remote.address for ${remoteNode}`,
				);
				break;
			}

			// Find the BGP instance name for this node
			const instanceName = bgpInstanceByNode.get(nodeName);
			if (!instanceName) {
				console.warn(
					`BGP connection on ${nodeName}: no bgp-instance-exist check found`,
				);
				break;
			}

			const args: Record<string, string> = {
				name: p.name ?? "",
				instance: instanceName,
				"local.role": p["local.role"] ?? "ebgp",
				"remote.as": remoteAs,
				"remote.address": remoteAddress,
			};
			if (p["output.redistribute"])
				args["output.redistribute"] = p["output.redistribute"];

			// Advertise LAN-facing networks via address-list so BGP routes propagate.
			// Transit nodes (no LAN interfaces) are skipped.
			const lanNetworks = nodeLanNetworks.get(nodeName) ?? [];
			for (const network of lanNetworks) {
				await client
					.runQuery("/ip/firewall/address-list/add", {
						list: "bgp-networks",
						address: network,
					})
					.catch(ignore);
			}
			if (lanNetworks.length > 0) {
				args["output.network"] = "bgp-networks";
			}

			await client.runQuery("/routing/bgp/connection/add", args).catch(ignore);
			break;
		}

		// Result checks — these pass once protocols converge; no direct config needed.
		case "mikrotik.ospf-neighbor-exist":
		case "mikrotik.bgp-session-established":
			break;
	}
}

async function applyLinuxCheck(
	docker: Docker,
	containerId: string,
	check: ParsedCheck,
): Promise<void> {
	const p = check.params;

	switch (check.checkId) {
		case "node-interface.check-ip": {
			await execInContainer(docker, containerId, [
				"ip",
				"addr",
				"add",
				p.ip ?? "",
				"dev",
				p.interface ?? "",
			]);
			await execInContainer(docker, containerId, [
				"ip",
				"link",
				"set",
				p.interface ?? "",
				"up",
			]);
			break;
		}

		case "linux.route-exist": {
			const dst = p.dst === "default" ? "default" : (p.dst ?? "");
			// Use "replace" so this works even when a default route already exists
			// on the management interface (eth0) inside the container.
			await execInContainer(docker, containerId, [
				"ip",
				"route",
				"replace",
				dst,
				"via",
				p.gateway ?? "",
			]);
			break;
		}

		case "linux.user-exist": {
			await execInContainer(docker, containerId, [
				"useradd",
				"-m",
				p.username ?? "",
			]);
			break;
		}
	}
}

export async function applyConfigurations(
	mikrotikClients: Record<string, RouterOSClient>,
	docker: Docker,
	nodeMap: Record<string, NodeInfo>,
	deviceTypes: DeviceTypes,
	checks: ParsedCheck[],
	topology: TopologyMarkdown,
): Promise<void> {
	// Build interface→IP map per node (from node-interface.check-ip checks)
	const nodeIpsByInterface = new Map<string, Map<string, string>>();
	for (const check of checks) {
		if (check.checkId !== "node-interface.check-ip") continue;
		const iface = check.params.interface;
		const ip = check.params.ip;
		if (!iface || !ip) continue;

		if (!nodeIpsByInterface.has(check.targetNode)) {
			nodeIpsByInterface.set(check.targetNode, new Map());
		}
		// Strip the prefix length so we store just the host IP
		const nodeIfaceMap = nodeIpsByInterface.get(check.targetNode);
		if (nodeIfaceMap) nodeIfaceMap.set(iface, ip.split("/")[0] ?? ip);
	}

	// Build AS→node map (from bgp-instance-exist checks)
	const nodeByAs = new Map<string, string>();
	for (const check of checks) {
		if (check.checkId !== "mikrotik.bgp-instance-exist") continue;
		if (check.params.as) nodeByAs.set(check.params.as, check.targetNode);
	}

	// Build node→BGP instance name map
	const bgpInstanceByNode = new Map<string, string>();
	for (const check of checks) {
		if (check.checkId !== "mikrotik.bgp-instance-exist") continue;
		if (check.params.name)
			bgpInstanceByNode.set(check.targetNode, check.params.name);
	}

	// Build node→LAN network prefixes map (interfaces connected to Linux clients).
	// Used to populate bgp-networks address-list for BGP route advertisement.
	const nodeLanNetworks = new Map<string, string[]>();
	for (const link of topology.links) {
		let routerNode: string | undefined;
		let routerInterface: string | undefined;
		if (
			deviceTypes[link.from] === "mikrotik" &&
			deviceTypes[link.to] === "linux"
		) {
			routerNode = link.from;
			routerInterface = link.interface;
		} else if (
			deviceTypes[link.to] === "mikrotik" &&
			deviceTypes[link.from] === "linux"
		) {
			routerNode = link.to;
			routerInterface = link.remoteInterface;
		}
		if (!routerNode || !routerInterface) continue;

		const checkIp = checks.find(
			(c) =>
				c.checkId === "node-interface.check-ip" &&
				c.targetNode === routerNode &&
				c.params.interface === routerInterface,
		);
		const cidr = checkIp?.params.ip;
		if (!cidr) continue;

		const network = getNetworkAddress(cidr);
		const existing = nodeLanNetworks.get(routerNode);
		if (existing) {
			existing.push(network);
		} else {
			nodeLanNetworks.set(routerNode, [network]);
		}
	}

	// Group checks by target node
	const checksByNode = new Map<string, ParsedCheck[]>();
	for (const check of checks) {
		if (!checksByNode.has(check.targetNode)) {
			checksByNode.set(check.targetNode, []);
		}
		checksByNode.get(check.targetNode)?.push(check);
	}

	// Apply checks per node sequentially (order matters within a node)
	for (const [nodeName, nodeChecks] of checksByNode) {
		const deviceType = deviceTypes[nodeName];

		if (deviceType === "mikrotik") {
			const client = mikrotikClients[nodeName];
			if (!client) {
				console.warn(`No RouterOS client for node ${nodeName}`);
				continue;
			}
			for (const check of nodeChecks) {
				await applyMikrotikCheck(
					client,
					check,
					nodeName,
					nodeByAs,
					bgpInstanceByNode,
					topology,
					nodeIpsByInterface,
					nodeLanNetworks,
				);
			}
		} else if (deviceType === "linux") {
			const info = nodeMap[nodeName];
			if (!info) {
				console.warn(`No node info for ${nodeName}`);
				continue;
			}
			for (const check of nodeChecks) {
				await applyLinuxCheck(docker, info.containerId, check);
			}
		}
	}
}
