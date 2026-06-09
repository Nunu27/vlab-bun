import os from "node:os";
import { decode } from "@msgpack/msgpack";
import { AsyncQueue, type WorkerProto } from "@vlab/grpc";
import { initRpc } from "../handlers/index";
import { metadata, workerClient } from "./client";

export const replyQueue = new AsyncQueue<WorkerProto.CommandPayload>();
const server = initRpc(replyQueue);

async function* createReplyStream(): AsyncIterable<WorkerProto.CommandPayload> {
	yield {
		workerSpec: {
			cpuCores: os.cpus().length,
			memoryMb: Math.round(os.totalmem() / 1024 / 1024),
			storageMb: 100000,
		},
	};

	for await (const reply of replyQueue) {
		yield reply;
	}
}

export async function listenToCommands() {
	try {
		const requestStream = workerClient.listenCommand(createReplyStream(), {
			metadata,
		});
		for await (const req of requestStream) {
			try {
				if (req.rpcMessage) {
					const message = decode(req.rpcMessage) as {
						id?: string;
						[k: string]: unknown;
					};
					const requestId = message.id || Math.random().toString(36).slice(2);

					server.handle(
						"manager",
						requestId,
						message as Parameters<typeof server.handle>[2],
						async () => ({}),
					);
				}
			} catch (err) {
				console.error("Failed to parse or handle command", err);
			}
		}
	} catch (err) {
		console.error("ListenCommand stream ended with error", err);
		setTimeout(listenToCommands, 5000);
	}
}

export async function streamMetrics() {
	try {
		await workerClient.sendMetrics(
			{
				cpuUsagePercent: Math.random() * 20,
				memoryUsagePercent: Math.random() * 40,
				storageUsagePercent: 10,
				score: 100,
				activeLabs: 0,
				activeNodes: 0,
			},
			{ metadata },
		);
	} catch (err) {
		console.error("Failed to send metrics", err);
	}
	setTimeout(streamMetrics, 10000);
}
