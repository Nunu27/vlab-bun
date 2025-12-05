import { getSession } from "@backend/middlewares/session";
import deviceWSHandler from "@backend/routes/device/ws";
import { Server as Engine } from "@socket.io/bun-engine";
import { Server } from "socket.io";
import {
	Client2ServerEvents,
	InterServerEvents,
	Server2ClientEvents,
	SocketData,
	wsSchemas
} from "./schema";

type HandlerKey = keyof Client2ServerEvents | keyof InterServerEvents;

const handlers = { ...deviceWSHandler };

const io = new Server<
	Client2ServerEvents,
	Server2ClientEvents,
	InterServerEvents,
	SocketData
>();

const engine = new Engine({
	path: "/ws"
});

io.bind(engine);

io.use(async (socket, next) => {
	const sessionId: string | undefined = socket.handshake.auth.session;
	if (!sessionId) return next(new Error("Unauthorized"));

	const session = await getSession(sessionId);
	if (!session.data) return next(new Error("Unauthorized"));

	socket.data.session = session as SocketData["session"];
	next();
});

io.on("connection", (socket) => {
	console.log(`Socket connected: ${socket.id}`);
	socket.on("disconnect", () => {
		console.log(`Socket disconnected: ${socket.id}`);
	});

	for (const [name, handler] of Object.entries(handlers)) {
		const event = name as HandlerKey;
		const schema = wsSchemas[event];

		socket.on(event, async (data) => {
			if (!schema.data.Check(data)) {
				return socket.emit("error", `Invalid data for event ${event}`);
			}

			const reply = ((type: any, data?: any) => {
				socket.emit(`${event}/reply`, { type, data });
			}) as unknown as Parameters<typeof handler>[2];

			try {
				await handler(socket, data, reply);
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

export { engine, io };
export type {
	Client2ServerEvents,
	InterServerEvents,
	Server2ClientEvents,
	SocketData
};
