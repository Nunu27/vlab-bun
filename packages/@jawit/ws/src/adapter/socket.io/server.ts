/** biome-ignore-all lint/suspicious/noExplicitAny: generic constraint */

import type { DefaultEventsMap, Server, Socket } from "socket.io";
import type WSContracts from "../../base/contracts";
import WSServer from "../../base/server";

export default class SocketIOServer<
	TWSContracts extends WSContracts<any, any>,
	TSocketData = any,
> extends WSServer<
	TWSContracts,
	Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, TSocketData>
> {
	public attach(
		io: Server<
			DefaultEventsMap,
			DefaultEventsMap,
			DefaultEventsMap,
			TSocketData
		>,
	) {
		io.of("/").adapter.on("leave-room", (room, id) => {
			const [eventName, executionId] = room.split("::");
			if (!eventName || !executionId) return;

			const cleanup = this.disposeHandlers.get(eventName);
			if (!cleanup) return;

			const isConnected = io.sockets.sockets.has(id);

			if (isConnected) {
				void cleanup(executionId);
			} else {
				// Delay cleanup for reconnection check
				setTimeout(
					async () => {
						const sockets = await io.in(room).fetchSockets();
						if (!sockets.length) void cleanup(executionId);
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

				for (const [event, handler] of this.handlers.entries()) {
					socket.on(
						event,
						async (payload: {
							data: unknown;
							params?: Record<string, unknown>;
							requestId?: string;
						}) => {
							try {
								// 1. Run all inherited WSServer Middlewares
								const meta = this.contracts.contracts[event]?.meta;
								for (const middleware of this.middlewares) {
									await new Promise<void>((resolve, reject) => {
										try {
											const res = middleware({ socket, meta }, (err) => {
												if (err) return reject(err);
												resolve();
											});
											if (res instanceof Promise) {
												res.catch(reject);
											}
										} catch (err) {
											reject(err);
										}
									});
								}

								// 2. Schema Runtime Validation
								const validatedData = this.validateIncomingData(
									event as Parameters<typeof this.validateIncomingData>[0],
									payload.data,
								);

								const replyFn = payload.requestId
									? (type: string, data: unknown) => {
											socket.emit(`${event}:reply:${payload.requestId}`, {
												type,
												data,
											});
										}
									: undefined;

								const config = {
									socket,
									data: validatedData,
									...(payload.params ? { params: payload.params } : {}),
									...(replyFn ? { reply: replyFn } : {}),
									...(payload.requestId
										? { executionId: payload.requestId }
										: {}),
								};

								const roomName = `${event}::${payload.requestId}`;
								if (payload.requestId) {
									socket.join(roomName);
								}

								await handler(config as Parameters<typeof handler>[0]);
							} catch (err) {
								if (payload.requestId) {
									socket.emit(`${event}:reply:${payload.requestId}`, {
										type: "__error",
										data: err instanceof Error ? err.message : String(err),
									});
								}
							}
						},
					);
				}
			},
		);
	}
}
