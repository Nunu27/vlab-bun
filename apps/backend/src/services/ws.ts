import { getSession } from "@backend/middlewares/session";
import { wsHandlers } from "@backend/routes/ws";
import { Server as Engine } from "@socket.io/bun-engine";
import { createAdapter } from "@socket.io/redis-streams-adapter";
import {
	wsSchemas,
	type Client2ServerEvents,
	type InterServerEvents,
	type Server2ClientEvents,
	type SocketData
} from "@vlab/shared/schemas";
import cluster from "cluster";
import { Server } from "socket.io";
import parser from "socket.io-msgpack-parser";
import { redisClient } from "./redis";

type HandlerKey = keyof Client2ServerEvents | keyof InterServerEvents;

const io = new Server<
	Client2ServerEvents,
	Server2ClientEvents,
	InterServerEvents,
	SocketData
>({
	parser,
	adapter: createAdapter(redisClient, {
		streamName: "ws",
		sessionKeyPrefix: "session:ws:"
	}),
	connectionStateRecovery: {
		maxDisconnectionDuration: 2 * 60 * 1000,
		skipMiddlewares: true
	}
});

if (cluster.isPrimary) {
	setInterval(() => {
		io.emit("ping", null);
	}, 1000);
}

const engine = new Engine({
	path: "/ws"
});

io.bind(engine);

io.use(async (socket, next) => {
	const sessionId: string | undefined = socket.handshake.auth.session;
	if (!sessionId) return next(new Error("Unauthorized"));

	const session = await getSession(sessionId);
	if (!session.data) return next(new Error("Unauthorized"));

	socket.data.session = session.data;

	next();
});

io.on("connection", (socket) => {
	socket.on("unsubscribe", async (data) => {
		const [event, id] = data.split("::");
		const targetSchema = wsSchemas[event];

		if (targetSchema?.cleanup) {
			await targetSchema.cleanup(id);
		}

		await socket.leave(id);
	});

	for (const [name, handler] of Object.entries(wsHandlers)) {
		const event = name as Exclude<HandlerKey, "unsubscribe">;
		const schema = wsSchemas[event];

		socket.join(event);

		socket.on(event, async (data: any) => {
			if (!schema.data.Check(data)) {
				return socket.emit("error", `Invalid data for event ${event}`);
			}

			const id = Bun.randomUUIDv7();
			const reply = ((type: any, data?: any) => {
				(schema.volatile ? socket.volatile : socket).emit(`${event}/reply`, {
					type,
					data
				});
			}) as unknown as Parameters<typeof handler>[0]["reply"];

			const room = `${event}::${id}`;
			socket.join(room);
			socket.emit(`${event}/reply`, { type: "id", data: room });

			try {
				await (handler as any)({ id, socket, data, reply });
			} catch (error) {
				console.error(error);
				reply("error", (error as Error).message);
				socket.emit("error", `Error handling event ${event}: ${error}`);
			} finally {
				reply("done");
			}
		});
	}
});

io.of("/").adapter.on("leave-room", (room, id) => {
	const [eventName, executionId] = room.split("::");
	if (!eventName || !executionId) return;

	const schema = wsSchemas[eventName as HandlerKey];
	if (!schema?.cleanup) return;

	setTimeout(() => {
		const isConnected = io.sockets.sockets.has(id);

		if (isConnected) {
			void schema.cleanup?.(executionId);
		} else {
			setTimeout(
				async () => {
					const sockets = await io.in(room).fetchSockets();
					if (sockets.length === 0) {
						void schema.cleanup?.(executionId);
					}
				},
				2 * 60 * 1000
			);
		}
	});
});

export { engine, io };
export type {
	Client2ServerEvents,
	InterServerEvents,
	Server2ClientEvents,
	SocketData
};
