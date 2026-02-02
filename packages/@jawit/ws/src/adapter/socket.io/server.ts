import type { Server, Socket } from "socket.io";
import type WSContracts from "../../base/contracts";
import WSServer from "../../base/server";

export default class SocketIOServer<
	// biome-ignore lint/suspicious/noExplicitAny: generic constraint
	TWSContracts extends WSContracts<any, any>,
> extends WSServer<TWSContracts, Socket> {
	public attach(io: Server) {
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

		io.on("connection", (socket: Socket) => {
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
								const passed = await middleware(socket, meta);
								if (passed === false) {
									return socket.emit(
										"error",
										`Middleware rejected event: ${event}`,
									);
								}
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
							console.error(`Error handling event ${event}:`, err);
						}
					},
				);
			}
		});
	}
}
