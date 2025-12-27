import type { ContainerInspectInfo } from "dockerode";
import EventEmitter from "events";
import { LABELS } from "./constants";
import containerHandler from "./container-handler";
import networkMonitor from "./network-monitor";
import type {
	ContainerEvent,
	Context,
	Events,
	NodeData,
	NodeInfo,
	Options,
	SessionData
} from "./types";
import { isKey } from "./utils";

let initialized = false;
const eventEmitter = new EventEmitter<Events>();
const sessionIds = new Set<string>();

async function handleDockerEvent(ctx: Context, event: ContainerEvent) {
	const { logger } = ctx;

	const key = event.Action.startsWith("health_status:")
		? "health_status"
		: event.Action;
	if (!isKey(key, containerHandler)) return;

	try {
		logger.debug("Handling docker event: %s", event.Action);
		await containerHandler[key](ctx, event);
	} catch (error) {
		logger.error({ err: error }, "Error handling docker event");
	}
}

async function emitInitialState(ctx: Context) {
	const { docker, logger, eventEmitter } = ctx;

	logger.debug("Retrieving initial state...");

	const containers = await docker.listContainers();
	const sessions: SessionData[] = [];
	const nodes: NodeData[] = [];

	for (const container of containers) {
		if (!("Health" in container)) continue;

		const healthData =
			container.Health as ContainerInspectInfo["State"]["Health"];
		const health = healthData?.Status === "none" ? null : healthData?.Status;

		const {
			[LABELS.NODE_ID]: id,
			[LABELS.CLAB_NODE_NAME]: name,
			[LABELS.CLAB_NODE_KIND]: deviceKind,
			[LABELS.DEVICE_ID]: deviceId,
			[LABELS.SESSION_ID]: labSessionId,
			[LABELS.LAB_TYPE]: type,
			[LABELS.LAB_ID]: labId,
			[LABELS.OWNER_ID]: ownerId
		} = container.Labels;

		const ports: Record<number, number> = {};

		for (const { PublicPort, PrivatePort } of container.Ports) {
			if (!PublicPort) continue;

			ports[PrivatePort] = PublicPort;
		}

		nodes.push({
			id,
			name,
			health,
			status: container.State,
			labSessionId,
			deviceId,
			ports,
			interfaces: await networkMonitor.extractInterfaces(
				ctx,
				docker.getContainer(container.Id),
				{ id, deviceKind } as NodeInfo
			)
		} as NodeData);

		if (!sessionIds.has(labSessionId!)) {
			sessionIds.add(labSessionId!);

			sessions.push({
				id: labSessionId!,
				type,
				labId,
				ownerId
			} as SessionData);
		}

		await networkMonitor.start(ctx, docker.getContainer(container.Id), {
			id: container.Labels[LABELS.NODE_ID],
			labSessionId: container.Labels[LABELS.SESSION_ID],
			deviceKind: container.Labels[LABELS.CLAB_NODE_KIND]
		} as NodeInfo);
	}

	eventEmitter.emit("snapshot", { sessions, nodes });
}

async function initMonitoring(options: Options) {
	const { docker, logger } = options;

	const ctx = {
		...options,
		sessionIds,
		eventEmitter
	};

	logger.info("Initializing monitor...");

	await emitInitialState(ctx);
	const stream = await docker.getEvents({
		filters: {
			type: ["container"],
			event: ["create", "destroy", "health_status"]
		}
	});
	stream.on("data", (chunk: string) => {
		try {
			const str = chunk.toString();
			const lines = str.split("\n").filter((l) => l.trim());
			for (const line of lines) {
				handleDockerEvent(ctx, JSON.parse(line));
			}
		} catch (err) {
			logger.error({ err }, "Error parsing docker event");
		}
	});

	stream.on("error", (err) => {
		initialized = false;
		logger.error({ err }, "Docker event stream failed, restarting...");
		setTimeout(createMonitor, 5000, ctx);
	});

	logger.info("Monitor initialized");
}

export function createMonitor(options: Options) {
	if (initialized) {
		options.logger.info("Monitor already initialized");
	} else {
		initialized = true;
		initMonitoring(options).catch((err) => {
			initialized = false;
			options.logger.error({ err }, "Failed to initialize monitor");
			setTimeout(createMonitor, 5000, options);
		});
	}

	return eventEmitter;
}
