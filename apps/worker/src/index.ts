import os from "node:os";
import { decode, encode } from "@msgpack/msgpack";
import { appRouter, MonitorProto, WorkerProto } from "@vlab/grpc";
import { createChannel, createClient, Metadata } from "nice-grpc";
import { deployLab, destroyLab } from "./commands/clab.js";
import { startLabEvaluation, stopLabEvaluation } from "./commands/evaluator.js";
import env from "./env.js";
import { clabMonitor } from "./services/monitor.js";

const channel = createChannel(env.MANAGER_GRPC_URL);

const monitorClient = createClient(
	MonitorProto.MonitorServiceDefinition,
	channel,
);
const workerClient = createClient(WorkerProto.WorkerServiceDefinition, channel);

const metadata = new Metadata();
metadata.set("worker-id", env.WORKER_ID);

// Waycast Server for handling commands from Manager
const activeStreams = new Set<string>();

const server = appRouter.buildServer({
	topic: {
		subscribe: (_connId, ...topics) => {
			for (const topic of topics) activeStreams.add(topic);
		},
		unsubscribe: (_connId, ...topics) => {
			for (const topic of topics) activeStreams.delete(topic);
		},
	},
	emit: (topic, message) => {
		if (activeStreams.has(topic)) {
			replyQueue.push({ waycastMessage: Buffer.from(encode(message)) });
		}
	},
	reply: (_topic, message) => {
		replyQueue.push({ waycastMessage: Buffer.from(encode(message)) });
	},
});

// Register Command Handlers
server.on("clab:deployLab", async (ctx) => {
	const { sessionId, config } = ctx.payload;
	await deployLab(sessionId, config as any);
	return true;
});

server.on("clab:destroyLab", async (ctx) => {
	const { sessionId } = ctx.payload;
	await destroyLab(sessionId);
	return true;
});

server.on("evaluator:start", async (ctx) => {
	const { sessionId, values } = ctx.payload;
	const nodeMap = ctx.payload.nodeMap as any;
	const sessionChecks = ctx.payload.sessionChecks as any;
	await startLabEvaluation(
		sessionId,
		nodeMap,
		sessionChecks,
		values,
		(id, completed) => {
			ctx.reply("checkChanged", { id, completed });
		},
	);
	return true;
});

server.on("evaluator:stop", async (ctx) => {
	const { sessionId, immediate } = ctx.payload;
	await stopLabEvaluation(sessionId, { immediate: immediate || false });
	return true;
});

server.on("docker:pullImage", async (ctx) => {
	const { image } = ctx.payload;
	const docker = (await import("./utils/docker.js")).default;
	await new Promise<void>((resolve, reject) => {
		docker.pull(image, {}, (err: any, stream: any) => {
			if (err || !stream) return reject(err ?? new Error("Image pull failed"));
			docker.modem.followProgress(stream, (err: any) => {
				if (err) return reject(err);
				resolve();
			});
		});
	});
	return true;
});

// Bi-directional Stream Queue
const replyQueue: WorkerProto.CommandPayload[] = [];
let replyResolver: (() => void) | null = null;

async function* createReplyStream(): AsyncIterable<WorkerProto.CommandPayload> {
	// First message is the handshake
	yield {
		workerSpec: {
			cpuCores: os.cpus().length,
			memoryMb: Math.round(os.totalmem() / 1024 / 1024),
			storageMb: 100000, // Hardcoded or query fs
		},
	};

	while (true) {
		if (replyQueue.length > 0) {
			yield replyQueue.shift()!;
		} else {
			await new Promise<void>((resolve) => {
				replyResolver = resolve;
			});
			replyResolver = null;
		}
	}
}

// Override push to trigger resolver
const originalPush = replyQueue.push.bind(replyQueue);
replyQueue.push = (...items) => {
	const res = originalPush(...items);
	if (replyResolver) replyResolver();
	return res;
};

async function listenToCommands() {
	try {
		const requestStream = workerClient.listenCommand(createReplyStream(), {
			metadata,
		});
		for await (const req of requestStream) {
			try {
				if (req.waycastMessage) {
					const message = decode(req.waycastMessage) as any;
					const requestId = message.id || Math.random().toString(36).slice(2);

					// Handle via Waycast
					server.handle("manager", requestId, message, async () => ({}));
				}
			} catch (err) {
				console.error("Failed to parse or handle command", err);
			}
		}
	} catch (err) {
		console.error("ListenCommand stream ended with error", err);
		setTimeout(listenToCommands, 5000); // Reconnect
	}
}

// Monitor Events Stream
const eventQueue: MonitorProto.MonitorEvent[] = [];
let eventResolver: (() => void) | null = null;

async function* createEventStream(): AsyncIterable<MonitorProto.MonitorEvent> {
	while (true) {
		if (eventQueue.length > 0) {
			yield eventQueue.shift()!;
		} else {
			await new Promise<void>((resolve) => {
				eventResolver = resolve;
			});
			eventResolver = null;
		}
	}
}

const originalEventPush = eventQueue.push.bind(eventQueue);
eventQueue.push = (...items) => {
	const res = originalEventPush(...items);
	if (eventResolver) eventResolver();
	return res;
};

async function streamEvents() {
	try {
		await monitorClient.streamMonitorEvents(createEventStream(), { metadata });
	} catch (err) {
		console.error("StreamMonitorEvents ended with error", err);
		setTimeout(streamEvents, 5000); // Reconnect
	}
}

async function streamMetrics() {
	try {
		await workerClient.sendMetrics(
			{
				cpuUsagePercent: Math.random() * 20, // stub
				memoryUsagePercent: Math.random() * 40, // stub
				storageUsagePercent: 10, // stub
				score: 100, // stub
				activeLabs: 0, // stub
				activeNodes: 0, // stub
			},
			{ metadata },
		);
	} catch (err) {
		console.error("Failed to send metrics", err);
	}
	setTimeout(streamMetrics, 10000);
}

// Hook clabMonitor to Event Stream
function bindMonitorEvents() {
	const { emitter, init } = clabMonitor;

	const forwardEvent = (type: string) => {
		emitter.on(type as any, (...args: any[]) => {
			eventQueue.push({ type, payload: JSON.stringify(args) });
		});
	};

	[
		"stale-session",
		"snapshot",
		"session-create",
		"session-remove",
		"node-create",
		"node-remove",
		"node-health",
		"interface-update",
	].forEach(forwardEvent);

	init();
}

// Main Boot
console.log("Starting Worker...");
listenToCommands();
streamEvents();
streamMetrics();
bindMonitorEvents();
