import type {
	appRouter,
	GrpcRoutes,
	GrpcRpcCallbacks,
	GrpcRpcPayloadOf,
	GrpcRpcResponseOf,
} from "@vlab/grpc";

export const connectedWorkers = new Map<
	string,
	ReturnType<typeof appRouter.buildClient>
>();

export async function getWorker(workerId: string) {
	const worker = connectedWorkers.get(workerId);
	if (!worker) {
		throw new Error(`Worker ${workerId} is not connected to this manager!`);
	}

	return worker;
}

export async function sendCommandToWorker<
	K extends Extract<keyof GrpcRoutes, string>,
>(
	workerId: string,
	command: K,
	payload: GrpcRpcPayloadOf<K>,
	replies?: Omit<GrpcRpcCallbacks<K>, "response" | "error">,
): Promise<GrpcRpcResponseOf<K>> {
	const client = await getWorker(workerId);

	return new Promise((resolve, reject) => {
		// @ts-expect-error: TS intersection of mapped types and spreads is too complex
		client.rpc(command, {
			payload,
			callbacks: {
				...replies,
				response: resolve,
				error: (err: string) => reject(new Error(err)),
			},
		});
	});
}
