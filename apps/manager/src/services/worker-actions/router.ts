import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import { connectedWorkers } from "@manager/services/grpc";
import { encode } from "@msgpack/msgpack";

const logger = baseLogger.child({ name: "worker-action" });

type ActionHandler<P> = (workerId: string, payload: P) => Promise<void>;

export class WorkerActionRouter<
	// biome-ignore lint/complexity/noBannedTypes: We need {} for precise intersection
	T extends Record<string, unknown> = {},
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
			logger.debug(
				{ actionName, workerId, payload },
				`Executing action ${actionName} locally for worker ${workerId}`,
			);
			this.handlers
				.get(actionName)?.(workerId, payload)
				.catch((err) => {
					logger.error(
						{ err },
						`Worker action ${actionName} failed for ${workerId}:`,
					);
				});
		} else {
			logger.debug(
				{ actionName, workerId, payload },
				`Forwarding action ${actionName} via Redis to worker ${workerId}`,
			);
			await redis.client.publish(
				`vlab:worker-action:${workerId}`,
				Buffer.from(encode({ actionName, payload })),
			);
		}
	}

	async handleForwarded<K extends keyof T & string>(
		actionName: K,
		workerId: string,
		payload: T[K],
	) {
		logger.debug(
			{ actionName, workerId, payload },
			`Executing forwarded action ${actionName} for worker ${workerId}`,
		);
		const handler = this.handlers.get(actionName);
		if (handler && connectedWorkers.has(workerId)) {
			await handler(workerId, payload);
		}
	}
}
