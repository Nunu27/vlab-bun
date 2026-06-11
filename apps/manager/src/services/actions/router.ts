import redis from "@manager/lib/redis";
import { connectedWorkers } from "@manager/services/grpc";
import { encode } from "@msgpack/msgpack";

type ActionHandler<P> = (workerId: string, payload: P) => Promise<void>;

export class WorkerActionRouter<
	T extends Record<string, unknown> = Record<string, never>,
> {
	private handlers = new Map<string, ActionHandler<unknown>>();

	on<K extends string, P>(
		actionName: K,
		handler: ActionHandler<P>,
	): WorkerActionRouter<T & Record<K, P>> {
		this.handlers.set(actionName, handler as ActionHandler<unknown>);
		return this as unknown as WorkerActionRouter<T & Record<K, P>>;
	}

	async dispatch<K extends keyof T & string>(
		actionName: K,
		workerId: string,
		payload: T[K],
	) {
		if (connectedWorkers.has(workerId)) {
			this.handlers
				.get(actionName)?.(workerId, payload)
				.catch((err) => {
					console.error(
						`Worker action ${actionName} failed for ${workerId}:`,
						err,
					);
				});
		} else {
			await redis.client.publish(
				`vlab:worker-action:${workerId}`,
				Buffer.from(encode({ actionName, payload })),
			);
		}
	}

	async handleForwarded(
		actionName: string,
		workerId: string,
		payload: unknown,
	) {
		const handler = this.handlers.get(actionName);
		if (handler && connectedWorkers.has(workerId)) {
			await handler(workerId, payload);
		}
	}
}
