import { LABELS } from "@backend/constants";
import db from "@backend/db";
import {
	labNodes,
	labSessions,
	type LabNodeInterfaceData
} from "@backend/db/schema";
import logger from "@backend/services/logger";
import Throttler from "@backend/utils/throttler";
import { decode } from "@msgpack/msgpack";
import type {
	DeviceKind,
	LabType,
	NodeHealth,
	NodeStatus
} from "@vlab/shared/enums";
import Docker from "dockerode";
import docker from "@backend/services/docker";
import { eq, inArray, sql, type InferSelectModel } from "drizzle-orm";

type LabNode = InferSelectModel<typeof labNodes>;
type LabSession = InferSelectModel<typeof labSessions>;

const throttler = new Throttler(500);

const interfaceMonitors = new Map<
	string,
	{ exec: Docker.Exec; stream: NodeJS.ReadableStream }
>();

const statusMap: Record<string, NodeStatus> = {
	create: "created",
	start: "running",
	started: "running",
	stop: "exited",
	stopped: "exited",
	restart: "restarting",
	restarting: "restarting",
	kill: "dead",
	killed: "dead",
	remove: "removing",
	die: "dead",
	pause: "paused",
	paused: "paused",
	unpause: "running",
	unpaused: "running"
};

// Actions that require syncing container state
const SYNC_ACTIONS = new Set([
	"start",
	"stop",
	"die",
	"kill",
	"restart",
	"pause",
	"unpause",
	"health_status",
	"exec_create",
	"exec_start"
]);

function getSessionPorts(inspect: Docker.ContainerInspectInfo): number[] {
	const labels = inspect.Config?.Labels;
	if (!labels) return [];

	const portsLabel = labels[LABELS.LAB_PORTS];
	if (!portsLabel) return [];

	try {
		const buffer = Buffer.from(portsLabel, "base64");
		const decoded = decode(buffer);
		return Array.isArray(decoded) ? (decoded as number[]) : [];
	} catch (err) {
		logger.error({ err }, "Failed to decode vlab.lab.ports");
		return [];
	}
}

type ExtractedNodeData = Pick<LabNode, "name" | "deviceId" | "ports"> &
	Pick<LabSession, "labId" | "ownerId"> & {
		id: string;
		deviceKind: DeviceKind;
		labSessionId: string;
		labType: LabType;
	};

function extractNodeData(
	inspect: Docker.ContainerInspectInfo
): ExtractedNodeData | null {
	const labels = inspect.Config?.Labels;
	if (!labels) return null;

	// Early return if required labels are missing
	const nodeId = labels[LABELS.NODE_ID];
	const nodeName = labels[LABELS.CLAB_NODE_NAME];
	const nodeKind = labels[LABELS.CLAB_NODE_KIND];
	const sessionId = labels[LABELS.SESSION_ID];
	const ownerId = labels[LABELS.OWNER_ID];

	if (!nodeId || !nodeName || !nodeKind || !sessionId || !ownerId) {
		return null;
	}

	return {
		id: nodeId,
		name: nodeName,
		deviceKind: nodeKind as DeviceKind,
		labId: labels[LABELS.LAB_ID] || null,
		labSessionId: sessionId,
		labType: labels[LABELS.LAB_TYPE] as LabType,
		ownerId: ownerId,
		deviceId: labels[LABELS.DEVICE_ID] || null,
		ports: extractPortMappings(inspect)
	};
}

async function ensureLabSession(
	container: Docker.Container,
	inspect: Docker.ContainerInspectInfo
) {
	const data = extractNodeData(inspect);
	if (!data) return null;

	const { labSessionId } = data;

	return await throttler.run(labSessionId, async () => {
		logger.debug(
			`Creating lab session for container ${container.id}. SessionId: ${data.labSessionId}, LabId: ${data.labId}`
		);

		const ports = getSessionPorts(inspect);

		await db
			.insert(labSessions)
			.values({
				id: data.labSessionId,
				type: data.labType,
				labId: data.labId,
				ownerId: data.ownerId,
				ports
			})
			.onConflictDoNothing();
	});
}

function extractPortMappings(
	inspect: Docker.ContainerInspectInfo
): Record<number, number> {
	const portMappings: Record<number, number> = {};
	const portBindings = inspect.HostConfig?.PortBindings;

	if (!portBindings) return portMappings;

	for (const [containerPort, bindings] of Object.entries(portBindings)) {
		const match = containerPort.match(/(\d+)/);
		if (!match) continue;

		const containerPortNum = parseInt(match[1]);
		if (isNaN(containerPortNum) || !Array.isArray(bindings)) continue;

		for (const binding of bindings) {
			const hostPort = parseInt(binding.HostPort);
			if (!isNaN(hostPort)) {
				portMappings[containerPortNum] = hostPort;
				break;
			}
		}
	}

	return portMappings;
}

async function extractInterfaces(
	container: Docker.Container,
	inspect?: Docker.ContainerInspectInfo
): Promise<Record<string, LabNodeInterfaceData>> {
	const interfaces: Record<string, LabNodeInterfaceData> = {};

	try {
		// Check if container is running first
		if (!inspect) {
			inspect = await container.inspect();
		}

		// Only extract interfaces if container is running
		if (!inspect.State?.Running) {
			logger.debug(
				`Container ${
					inspect.Name || container.id
				} is not running, skipping interface extraction`
			);
			return interfaces;
		}

		// Use 'ip -j addr show' to get JSON output of all interfaces
		const exec = await container.exec({
			Cmd: ["ip", "-j", "addr", "show"],
			AttachStdout: true,
			AttachStderr: true,
			Tty: false
		});

		const stream = await exec.start({ Detach: false, Tty: false });

		// Collect output with proper demuxing using dockerode's demuxStream
		let stdoutData = "";
		let stderrData = "";

		const stdout = new (require("stream").Writable)({
			write(chunk: any, _encoding: any, callback: any) {
				stdoutData += chunk.toString();
				callback();
			}
		});

		const stderr = new (require("stream").Writable)({
			write(chunk: any, _encoding: any, callback: any) {
				stderrData += chunk.toString();
				callback();
			}
		});

		// Demux the stream
		container.modem.demuxStream(stream, stdout, stderr);

		await new Promise((resolve, reject) => {
			stream.on("end", resolve);
			stream.on("error", reject);
			setTimeout(() => reject(new Error("Timeout")), 5000);
		});

		// Parse JSON output from stdout
		const interfaceList = JSON.parse(stdoutData);

		for (const iface of interfaceList) {
			// Skip loopback interface
			if (iface.ifname === "lo") continue;

			const ifaceData: LabNodeInterfaceData = {
				state: iface.operstate === "UP" ? "UP" : "DOWN"
			};

			// Extract MAC address
			if (iface.address) {
				ifaceData.macAddress = iface.address;
			}

			// Extract IP addresses
			if (iface.addr_info && Array.isArray(iface.addr_info)) {
				const ipv4 = iface.addr_info.find(
					(addr: any) => addr.family === "inet"
				);

				if (ipv4) {
					ifaceData.ipAddress = ipv4.local;
				}
			}

			interfaces[iface.ifname] = ifaceData;
		}
	} catch (err: any) {
		// Only log error if it's not the expected "container not running" error
		if (err.statusCode === 409 || err.reason === "container stopped/paused") {
			logger.debug(
				`Container not running, cannot extract interfaces: ${err.message}`
			);
		} else {
			logger.debug({ err }, "Failed to extract interfaces from container");
		}
	}

	return interfaces;
}

async function syncLabNode(
	container: Docker.Container,
	sessionId: string,
	inspect: Docker.ContainerInspectInfo
) {
	const data = extractNodeData(inspect);
	if (!data) return;

	const health = (inspect.State?.Health?.Status as NodeHealth) || null;
	const isRunning = inspect.State?.Running === true;
	const status = (inspect.State?.Status as NodeStatus) || "created";

	if (status === "removing") {
		await handleContainerRemoval(data.id, sessionId);
		return;
	}

	// Extract interfaces from the running container (pass inspect to avoid re-fetching)
	const interfaces = await extractInterfaces(container, inspect);

	logger.debug(
		`Syncing lab node ${data.name}. SessionId: ${sessionId}, ContainerId: ${container.id}`
	);

	// Check if node exists - only select id
	const existingNode = await db.query.labNodes.findFirst({
		where: eq(labNodes.id, data.id),
		columns: { id: true }
	});

	if (existingNode) {
		await db
			.update(labNodes)
			.set({
				health,
				status,
				ports: data.ports,
				interfaces,
				updatedAt: new Date()
			})
			.where(eq(labNodes.id, existingNode.id));
	} else {
		await db.insert(labNodes).values({
			id: data.id,
			name: data.name,
			health,
			status,
			deviceId: data.deviceId,
			labSessionId: sessionId,
			ports: data.ports,
			interfaces
		});
	}

	// Start interface monitor for running containers
	if (isRunning) {
		await startInterfaceMonitor(container, data.id, data.name);
	}
}

// Cleanup invalid nodes/sessions (no corresponding containers)
async function cleanupInvalidData() {
	logger.debug("Starting cleanup of invalid data");
	const containers = await docker.listContainers({ all: true });
	const activeNodeIds = new Set<string>();
	const activeNodeKeys = new Set<string>();

	// Build sets of active nodes in one pass
	for (const c of containers) {
		const labels = c.Labels;
		if (!labels) continue;

		const nodeId = labels[LABELS.NODE_ID];
		if (nodeId) {
			activeNodeIds.add(nodeId);
		}

		const sessionId = labels[LABELS.SESSION_ID];
		const name = labels[LABELS.CLAB_NODE_NAME];
		if (sessionId && name) {
			activeNodeKeys.add(`${sessionId}:${name}`);
		}
	}

	// Find all lab nodes to check against active containers
	const existingNodes = await db
		.select({
			id: labNodes.id,
			name: labNodes.name,
			labSessionId: labNodes.labSessionId
		})
		.from(labNodes);

	// Batch updates for stale nodes
	const sessionsToDelete: string[] = [];
	const nodesToDelete: string[] = [];

	for (const node of existingNodes) {
		const key = `${node.labSessionId}:${node.name}`;
		if (!activeNodeIds.has(node.id) && !activeNodeKeys.has(key)) {
			logger.info(
				`Found stale node (no container), deleting. NodeId: ${node.id}, NodeName: ${node.name}`
			);
			nodesToDelete.push(node.id);
			if (sessionsToDelete.includes(node.labSessionId)) {
				sessionsToDelete.push(node.labSessionId);
			}
		}
	}

	// Batch delete nodes
	if (nodesToDelete.length > 0) {
		await db.delete(labNodes).where(inArray(labNodes.id, nodesToDelete));

		logger.info(`Deleted ${nodesToDelete.length} stale nodes`);
	}

	// Batch delete sessions
	if (sessionsToDelete.length > 0) {
		await db
			.delete(labSessions)
			.where(inArray(labSessions.id, sessionsToDelete));
		logger.info(`Removed ${sessionsToDelete.length} empty sessions`);
	}
}

async function initializeData() {
	logger.info("Dehydrating existing containers...");
	const containers = await docker.listContainers({ all: true });

	// Filter vlab containers first to avoid unnecessary inspections
	const vlabContainers = containers.filter((c) => c.Labels?.[LABELS.LAB_TYPE]);

	logger.info("Found %d nodes", vlabContainers.length);

	const sessionsMap = new Map<string, typeof labSessions.$inferInsert>();
	const nodes: (typeof labNodes.$inferInsert)[] = [];

	// Process containers in parallel with concurrency limit
	const BATCH_SIZE = 10;
	for (let i = 0; i < vlabContainers.length; i += BATCH_SIZE) {
		const batch = vlabContainers.slice(i, i + BATCH_SIZE);
		await Promise.allSettled(
			batch.map(async (container) => {
				try {
					const cont = docker.getContainer(container.Id);
					const inspect = await cont.inspect();

					const data = extractNodeData(inspect);
					if (!data) return;

					// Prepare session data
					if (!sessionsMap.has(data.labSessionId)) {
						const ports = getSessionPorts(inspect);
						sessionsMap.set(data.labSessionId, {
							id: data.labSessionId,
							type: data.labType,
							labId: data.labId,
							ownerId: data.ownerId,
							ports
						});
					}

					// Extract interfaces from the running container
					const interfaces = await extractInterfaces(cont);

					// Prepare node data
					const health = (inspect.State?.Health?.Status as NodeHealth) || null;
					nodes.push({
						id: data.id,
						name: data.name,
						health,
						status: statusMap["start"] || "created",
						deviceId: data.deviceId,
						labSessionId: data.labSessionId,
						ports: data.ports,
						interfaces
					});
				} catch (err) {
					logger.error(
						{ err, containerId: container.Id },
						`Failed to sync container ${container.Id}`
					);
				}
			})
		);
	}

	if (sessionsMap.size > 0) {
		await db
			.insert(labSessions)
			.values(Array.from(sessionsMap.values()))
			.onConflictDoNothing();
	}

	if (nodes.length > 0) {
		await db
			.insert(labNodes)
			.values(nodes)
			.onConflictDoUpdate({
				target: labNodes.id,
				set: {
					health: sql`excluded.health`,
					status: sql`excluded.status`,
					ports: sql`excluded.ports`,
					interfaces: sql`excluded.interfaces`,
					updatedAt: new Date()
				}
			});
	}

	await cleanupInvalidData();
	logger.info("Initialization complete");
}

// Shared function to sync container state - used by both container and network events
async function syncContainerState(containerId: string, action?: string) {
	const container = docker.getContainer(containerId);

	try {
		const inspect = await container.inspect();

		// Verify it's a vlab container
		if (!inspect.Config?.Labels?.[LABELS.LAB_TYPE]) return;

		const data = extractNodeData(inspect);
		if (!data) return;

		if (action === "start" || action === "connect") {
			await ensureLabSession(container, inspect);
		} else {
			await throttler.wait(data.labSessionId);
		}

		await syncLabNode(container, data.labSessionId, inspect);
	} catch (err: any) {
		if (err.statusCode !== 404) {
			logger.error({ err, containerId }, "Error syncing container state");
		}
	}
}

async function handleContainerRemoval(nodeId: string, labSessionId: string) {
	logger.info(`Node removed, cleaning up. NodeId: ${nodeId}`);

	// Find container ID for this node to stop monitor
	for (const [containerId] of interfaceMonitors.entries()) {
		// Check if this monitor belongs to the removed node
		const container = docker.getContainer(containerId);
		try {
			const inspect = await container.inspect();
			const data = extractNodeData(inspect);
			if (data?.id === nodeId) {
				stopInterfaceMonitor(containerId);
				break;
			}
		} catch (err) {
			// Container already removed, clean up monitor
			stopInterfaceMonitor(containerId);
		}
	}

	// Delete node
	await db.delete(labNodes).where(eq(labNodes.id, nodeId));
	await throttler.run(labSessionId, async () => {
		await db.delete(labSessions).where(eq(labSessions.id, labSessionId));
	});
}

async function handleContainerEvent(event: any) {
	const attrs = event.Actor?.Attributes;
	const { Action: action, id: containerId } = event;

	// Handle container removal separately
	if (action === "remove") {
		const nodeId = attrs?.[LABELS.NODE_ID];
		const labSessionId = attrs?.[LABELS.SESSION_ID];

		if (nodeId && labSessionId) {
			await handleContainerRemoval(nodeId, labSessionId);
		}
		return;
	}

	if (!attrs?.[LABELS.LAB_TYPE]) return;

	// Stop interface monitor for stopped/paused containers
	if (
		action === "stop" ||
		action === "die" ||
		action === "kill" ||
		action === "pause"
	) {
		stopInterfaceMonitor(containerId);
	}

	// Handle exec events that might change network configuration
	if (action === "exec_start") {
		const execCmd = attrs.execID;
		// Check if this exec might be a network configuration command
		// Common commands: ip, ifconfig, dhclient, etc.
		if (execCmd) {
			// Re-sync interfaces after a brief delay to allow command to complete
			setTimeout(async () => {
				await syncContainerInterfaces(containerId);
			}, 1000);
		}
		return;
	}

	// Handle state sync actions
	if (SYNC_ACTIONS.has(action)) {
		await syncContainerState(containerId, action);
	} else if (action.startsWith("health_status")) {
		await handleHealthUpdate(attrs[LABELS.NODE_ID], action);
	}
}
async function handleHealthUpdate(nodeId: string, action: string) {
	await db
		.update(labNodes)
		.set({
			health: action.substring(15) as NodeHealth
		})
		.where(eq(labNodes.id, nodeId));
}

// Sync only interfaces for a specific container
async function syncContainerInterfaces(containerId: string) {
	const container = docker.getContainer(containerId);

	try {
		const inspect = await container.inspect();

		// Verify it's a vlab container
		if (!inspect.Config?.Labels?.[LABELS.LAB_TYPE]) return;

		const data = extractNodeData(inspect);
		if (!data) return;

		// Extract updated interfaces
		const interfaces = await extractInterfaces(container);

		logger.debug(
			`Updating interfaces for node ${data.name}. NodeId: ${data.id}`
		);

		// Update only interfaces field
		await db
			.update(labNodes)
			.set({
				interfaces,
				updatedAt: new Date()
			})
			.where(eq(labNodes.id, data.id));
	} catch (err: any) {
		if (err.statusCode !== 404) {
			logger.error({ err, containerId }, "Error syncing container interfaces");
		}
	}
}

// Start monitoring interface changes for a container using 'ip monitor'
async function startInterfaceMonitor(
	container: Docker.Container,
	nodeId: string,
	nodeName: string
) {
	const containerId = container.id;

	// Stop existing monitor if any
	stopInterfaceMonitor(containerId);

	try {
		// Verify container is running before starting monitor
		const inspect = await container.inspect();
		if (!inspect.State?.Running) {
			logger.debug(
				`Container ${nodeName} is not running, skipping interface monitor`
			);
			return;
		}

		// Run 'ip monitor address link' to watch for interface changes
		const exec = await container.exec({
			Cmd: ["ip", "monitor", "address", "link"],
			AttachStdout: true,
			AttachStderr: true,
			Tty: false
		});

		const stream = await exec.start({ Detach: false, Tty: false });

		// Store the monitor
		interfaceMonitors.set(containerId, { exec, stream });

		logger.info(`Started interface monitor for node ${nodeName} (${nodeId})`);

		// Create writable stream to collect stdout
		let dataBuffer = "";
		const stdout = new (require("stream").Writable)({
			write(chunk: any, _encoding: any, callback: any) {
				dataBuffer += chunk.toString();

				// Process complete lines
				const lines = dataBuffer.split("\n");
				dataBuffer = lines.pop() || ""; // Keep incomplete line

				for (const line of lines) {
					if (!line.trim()) continue;

					logger.debug(
						`Interface change detected in ${nodeName}: ${line.substring(
							0,
							100
						)}`
					);

					// Sync interfaces after a change is detected
					syncContainerInterfaces(containerId).catch((err) => {
						logger.error(
							{ err },
							"Error syncing interfaces after monitor event"
						);
					});
					break; // Only sync once per batch of changes
				}

				callback();
			}
		});

		const stderr = new (require("stream").Writable)({
			write(chunk: any, _encoding: any, callback: any) {
				logger.debug(
					`Interface monitor stderr for ${nodeName}: ${chunk.toString()}`
				);
				callback();
			}
		});

		// Demux the stream
		container.modem.demuxStream(stream, stdout, stderr);

		stream.on("error", (err) => {
			logger.error(
				{ err, nodeId, nodeName },
				`Interface monitor stream error for ${nodeName}`
			);
			interfaceMonitors.delete(containerId);
		});

		stream.on("end", () => {
			logger.debug(`Interface monitor ended for ${nodeName}`);
			interfaceMonitors.delete(containerId);
		});
	} catch (err: any) {
		// Don't log error if container is not running
		if (err.statusCode === 409 || err.reason === "container stopped/paused") {
			logger.debug(
				`Cannot start interface monitor for ${nodeName}: container not running`
			);
		} else {
			logger.error(
				{ err, nodeId, nodeName },
				`Failed to start interface monitor for ${nodeName}`
			);
		}
	}
}

// Stop interface monitor for a container
function stopInterfaceMonitor(containerId: string) {
	const monitor = interfaceMonitors.get(containerId);
	if (monitor) {
		try {
			if (
				monitor.stream &&
				typeof (monitor.stream as any).destroy === "function"
			) {
				(monitor.stream as any).destroy();
			}
		} catch (err) {
			logger.debug(
				{ err },
				`Error stopping interface monitor for ${containerId}`
			);
		}
		interfaceMonitors.delete(containerId);
	}
}

async function handleNetworkEvent(event: any) {
	const { Action: action } = event;

	// Only handle connect/disconnect events
	if (action !== "connect" && action !== "disconnect") return;

	const containerId = event.Actor?.Attributes?.container;
	if (!containerId) return;

	await syncContainerState(containerId, action);
}

async function startEventListener() {
	const filters = {
		type: ["container", "network"] as ("container" | "network")[],
		event: [
			...Array.from(SYNC_ACTIONS),
			"remove",
			"connect",
			"disconnect",
			"exec_start"
		]
	};

	docker.getEvents({ filters }, (err, stream) => {
		if (err || !stream) {
			logger.error({ err }, "Error getting Docker events");
			return;
		}

		stream.on("data", async (chunk: Buffer) => {
			const lines = chunk.toString().split("\n");

			for (const line of lines) {
				if (!line.trim()) continue;

				try {
					const event = JSON.parse(line);
					logger.info("Received Docker event: %s", event.Type);

					switch (event.Type) {
						case "container":
							await handleContainerEvent(event);
							break;
						case "network":
							await handleNetworkEvent(event);
							break;
					}
				} catch (err) {
					logger.error({ err, line }, "Error processing event");
				}
			}
		});

		stream.on("error", (err) => {
			logger.error({ err }, "Docker events stream error");
		});

		stream.on("end", () => {
			logger.warn("Docker events stream ended, reconnecting...");
			setTimeout(startEventListener, 5000);
		});
	});
}

let initialized = false;

// Startup
export async function startDockerMonitor() {
	if (initialized) return;
	initialized = true;

	await initializeData();
	await startEventListener();
}
