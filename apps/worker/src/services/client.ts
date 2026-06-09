import { WorkerProto } from "@vlab/grpc";
import { createChannel, createClient, Metadata } from "nice-grpc";
import env from "../env";

export const channel = createChannel(env.MANAGER_GRPC_URL);

export const workerClient = createClient(
	WorkerProto.WorkerServiceDefinition,
	channel,
);

export const metadata = new Metadata();
metadata.set("worker-id", env.WORKER_ID);
