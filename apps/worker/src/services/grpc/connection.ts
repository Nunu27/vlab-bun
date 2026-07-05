import os from "node:os";
import { AsyncQueue, type WorkerProto } from "@vlab/grpc";
import {
	RECONNECT_BASE_MS,
	RECONNECT_CAP_MS,
	RECONNECT_FACTOR,
} from "@worker/constants";
import env from "@worker/env";
import baseLogger from "@worker/lib/logger";
import { getStorageInfo } from "@worker/lib/system-metrics";
import { expBackoff } from "@worker/utils/backoff";
import { metadata, workerClient } from "./client";
import { feedMessage, setReplySink } from "./transport";

const logger = baseLogger.child({ service: "grpc" });

let stopped = false;
let reconnectAttempt = 0;

function sleep(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function* createReplyStream(
	queue: AsyncQueue<WorkerProto.CommandPayload>,
): AsyncIterable<WorkerProto.CommandPayload> {
	yield {
		workerSpec: {
			cpuCores: os.cpus().length,
			memoryMb: Math.round(os.totalmem() / 1024 / 1024),
			storageMb: Math.round(getStorageInfo().total),
			guacdHost: env.GUACD_HOST,
			guacdPort: env.GUACD_PORT,
		},
	};

	for await (const reply of queue) {
		yield reply;
	}
}

export async function runConnectionLoop() {
	stopped = false;

	while (!stopped) {
		const queue = new AsyncQueue<WorkerProto.CommandPayload>();
		setReplySink((raw) => queue.push({ payload: Buffer.from(raw, "base64") }));

		try {
			logger.info("Connecting to Manager gRPC server...");
			const requestStream = workerClient.listenCommand(
				createReplyStream(queue),
				{ metadata },
			);

			let established = false;
			for await (const req of requestStream) {
				if (!established) {
					established = true;
					reconnectAttempt = 0;
					logger.info("Connected to Manager gRPC server");
				}

				try {
					feedMessage(Buffer.from(req.payload).toString("base64"));
				} catch (err) {
					logger.error({ err }, "Failed to parse or handle command");
				}
			}

			if (stopped) break;
			logger.warn("ListenCommand stream ended, reconnecting");
		} catch (err) {
			if (stopped) break;
			logger.warn(
				{ err },
				"ListenCommand stream disconnected or ended with error",
			);
		} finally {
			setReplySink(undefined);
			queue.close();
		}

		const delay = expBackoff(reconnectAttempt, {
			base: RECONNECT_BASE_MS,
			factor: RECONNECT_FACTOR,
			cap: RECONNECT_CAP_MS,
		});
		reconnectAttempt++;
		await sleep(delay);
	}
}

export function stopConnectionLoop() {
	stopped = true;
}
