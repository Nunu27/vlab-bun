import redis from "@manager/lib/redis";
import { sessions } from "@manager/services/http/middlewares/auth";
import type { WSContext } from "@manager/types/ws";
import { Server as Engine } from "@socket.io/bun-engine";
import { createAdapter } from "@socket.io/redis-adapter";
import appRouter, {
	type ClientToServerEvents,
	type ServerToClientEvents,
} from "@vlab/ws";
import { type DefaultEventsMap, Server } from "socket.io";
import parser from "socket.io-msgpack-parser";

const pubClient = redis.client.duplicate();
const subClient = redis.client.duplicate();

const io = new Server<
	ClientToServerEvents,
	ServerToClientEvents,
	DefaultEventsMap,
	WSContext
>({
	parser,
	adapter: createAdapter(pubClient, subClient),
});

const engine = new Engine({ path: "/ws" });
io.bind(engine);

const server = appRouter.buildServer<WSContext>({
	logger: console,
	topic: {
		subscribe: (connId, ...topics) => {
			const socket = io.sockets.sockets.get(connId);
			socket?.join(topics);
		},
		unsubscribe: (connId, ...topics) => {
			const socket = io.sockets.sockets.get(connId);
			if (socket) {
				for (const t of topics) socket.leave(t);
			}
		},
	},
	emit: (topic, message) => io.to(topic).emit("data", message),
	reply: (topic, message) => io.to(topic).emit("reply", message),
});

io.use(async (socket, next) => {
	const sessionId = socket.handshake.auth.session;
	if (typeof sessionId !== "string") return next(new Error("Unauthorized"));

	const session = await sessions.get(sessionId);
	if (!session.data) return next(new Error("Unauthorized"));

	socket.data.session = session.data;
	next();
});

io.of("/").adapter.on("leave-room", (room, id) => {
	if (room.endsWith("|reply")) server.handleDispose(id, room);
});

io.on("connection", (socket) => {
	socket.on("rpc", (message, ack) => {
		const requestId = Math.random().toString(36).slice(2);
		ack?.(requestId);

		server.handle(socket.id, requestId, message, async (meta) => {
			const allowed = meta?.private?.includes(socket.data.session.role) ?? true;
			if (!allowed) throw new Error("Unauthorized");
			return { session: socket.data.session };
		});
	});
});

export default { engine, server, io };
