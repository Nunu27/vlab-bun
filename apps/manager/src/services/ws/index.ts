import baseLogger from "@manager/lib/logger";
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

const io = new Server<
	ClientToServerEvents,
	ServerToClientEvents,
	DefaultEventsMap,
	WSContext
>({
	parser,
	adapter: createAdapter(redis.client, redis.subscriber),
});

const engine = new Engine({ path: "/ws" });
io.bind(engine);

const logger = baseLogger.child({ service: "ws" });

const server = appRouter.buildServer<WSContext>({
	logger,
	topic: {
		subscribe: (connId, ...topics) => {
			io.sockets.sockets.get(connId)?.join(topics);
		},
		unsubscribe: (connId, ...topics) => {
			const socket = io.sockets.sockets.get(connId);
			if (!socket) return;

			for (const t of topics) socket.leave(t);
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
	socket.on("rpc", (message) => {
		server.handle(socket.id, message, async (meta) => {
			const allowed = meta?.private?.includes(socket.data.session.role) ?? true;
			if (!allowed) throw new Error("Unauthorized");
			return { session: socket.data.session };
		});
	});
});

export default { engine, server, io };
