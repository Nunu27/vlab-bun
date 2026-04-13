/** biome-ignore-all lint/suspicious/noExplicitAny: generic constraint */

import type { DefaultEventsMap, Server, Socket } from "socket.io";
import type WSContracts from "../../base/contracts";
import WSServer from "../../base/server";
import type {
	ExtractWSContracts,
	MaybePromise,
	WSServerEmitConfig,
	WSServerMiddleware,
} from "../../types";
import { compileEventPath } from "../../utils";

/**
 * Runs the middleware chain sequentially.
 * Returns a rejected promise if any middleware calls `next(err)` or throws.
 */
async function runMiddlewares<TContext, TMeta>(
	middlewares: WSServerMiddleware<TContext, TMeta>[],
	context: Parameters<WSServerMiddleware<TContext, TMeta>>[0],
): Promise<void> {
	for (const middleware of middlewares) {
		await new Promise<void>((resolve, reject) => {
			let settled = false;

			const next = (err?: Error) => {
				if (settled) return;
				settled = true;
				if (err) reject(err);
				else resolve();
			};

			try {
				const result = middleware(context, next);
				if (result instanceof Promise) {
					result.catch((err: unknown) => {
						if (!settled) {
							settled = true;
							reject(err);
						}
					});
				}
			} catch (err) {
				if (!settled) {
					settled = true;
					reject(err);
				}
			}
		});
	}
}

export default class SocketIOServer<
	TWSContracts extends WSContracts<any, any>,
	TSocketData = any,
> extends WSServer<
	TWSContracts,
	Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, TSocketData>
> {
	public io?: Server<
		DefaultEventsMap,
		DefaultEventsMap,
		DefaultEventsMap,
		TSocketData
	>;

	public emit<
		const TEvent extends keyof ExtractWSContracts<
			TWSContracts["contracts"],
			"server2client" | "inter"
		> &
			string,
	>(
		event: TEvent,
		config: WSServerEmitConfig<TEvent, TWSContracts["contracts"][TEvent]>,
	): void {
		if (!this.io) {
			throw new Error(
				"SocketIOServer is not attached to a socket.io instance.",
			);
		}

		const compiledEvent = compileEventPath(
			event as string,
			(config as any).params as Record<string, unknown> | undefined,
		);

		this.io.to(compiledEvent).emit(compiledEvent, {
			data: (config as any).data,
			params: (config as any).params,
		});
	}

	public attach(
		io: Server<
			DefaultEventsMap,
			DefaultEventsMap,
			DefaultEventsMap,
			TSocketData
		>,
	) {
		this.io = io;

		// When a socket leaves a room, check if the room's executionId cleanup should run.
		io.of("/").adapter.on("leave-room", (room, socketId) => {
			const separatorIndex = room.indexOf("::");
			if (separatorIndex === -1) return;

			const eventName = room.slice(0, separatorIndex);
			const executionId = room.slice(separatorIndex + 2);
			if (!eventName || !executionId) return;

			const cleanup = this.disposeHandlers.get(eventName);
			if (!cleanup) return;

			const isStillConnected = io.sockets.sockets.has(socketId);

			if (isStillConnected) {
				void cleanup({ executionId, socketId });
			} else {
				// Delay cleanup to allow reconnection within a window.
				setTimeout(
					async () => {
						const sockets = await io.in(room).fetchSockets();
						if (!sockets.length) void cleanup({ executionId, socketId });
					},
					2 * 60 * 1000,
				);
			}
		});

		io.on(
			"connection",
			(
				socket: Socket<
					DefaultEventsMap,
					DefaultEventsMap,
					DefaultEventsMap,
					TSocketData
				>,
			) => {
				socket.on("_jawit:cancel", (roomName: string) => {
					socket.leave(roomName);
				});

				socket.on("_jawit:subscribe", (roomName: string) => {
					socket.join(roomName);
				});

				socket.on("_jawit:unsubscribe", (roomName: string) => {
					socket.leave(roomName);
				});

				for (const [event, handler] of this.handlers.entries()) {
					socket.on(
						event,
						async (payload: {
							data: unknown;
							params?: Record<string, unknown>;
							requestId?: string;
						}) => {
							const replyOrError = (type: string, data: unknown) => {
								if (payload.requestId) {
									socket.emit(`${event}:reply:${payload.requestId}`, {
										type,
										data,
									});
								}
							};

							try {
								// 1. Run the middleware pipeline
								const meta = this.contracts.contracts[event]?.meta;
								await runMiddlewares(this.middlewares, { socket, meta });

								// 2. Schema runtime validation
								const validatedData = this.validateIncomingData(
									event as Parameters<typeof this.validateIncomingData>[0],
									payload.data,
								);

								// 3. Join the execution room (enables targeted server-push replies)
								if (payload.requestId) {
									socket.join(`${event}::${payload.requestId}`);
								}

								await handler({
									socket,
									data: validatedData,
									...(payload.params ? { params: payload.params } : {}),
									...(payload.requestId
										? {
												executionId: payload.requestId,
												reply: (type: string, data: unknown) =>
													replyOrError(type, data),
											}
										: {}),
								} as Parameters<typeof handler>[0]);
							} catch (err) {
								const message =
									err instanceof Error ? err.message : String(err);

								if (payload.requestId) {
									replyOrError("__error", message);
								} else {
									// No requestId — surface the error so it's never silently dropped.
									console.error(
										`[jawit/ws] Unhandled error for event "${event}":`,
										err,
									);
								}
							}
						},
					);
				}
			},
		);
	}
}

export type { MaybePromise };
