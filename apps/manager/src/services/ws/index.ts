import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import { sessions } from "@manager/services/http/middlewares/auth";
import { wsDisposalScheduler } from "@manager/services/queue/ws-disposal";
import type { WSContext } from "@manager/types/ws";
import { Server as Engine } from "@socket.io/bun-engine";
import { createAdapter } from "@socket.io/redis-streams-adapter";
import appRouter from "@vlab/ws";
import { type DefaultEventsMap, Server } from "socket.io";
import parser from "socket.io-msgpack-parser";
import type { WaycastAdapter, WaycastServerTransport } from "waycast";

type ClientToServerEvents = { message: (raw: string) => void };
type ServerToClientEvents = { message: (raw: string) => void };

const io = new Server<
	ClientToServerEvents,
	ServerToClientEvents,
	DefaultEventsMap,
	WSContext
>({
	parser,
	adapter: createAdapter(redis.client),
});

const engine = new Engine({ path: "/ws" });
io.bind(engine);

const logger = baseLogger.child({ service: "ws" });

io.use(async (socket, next) => {
	const sessionId = socket.handshake.auth.session;
	if (typeof sessionId !== "string") return next(new Error("Unauthorized"));

	const session = await sessions.get(sessionId);
	if (!session.data) return next(new Error("Unauthorized"));

	socket.data.session = session.data;
	next();
});

const transport: WaycastServerTransport<WSContext> = {
	start({ onConnection, onMessage, onDisconnection }) {
		io.on("connection", (socket) => {
			onConnection(socket.id, socket.data);
			socket.on("message", (raw) => onMessage(socket.id, raw));
			socket.on("disconnect", () => onDisconnection(socket.id));
		});
	},
	send(connectionId, raw) {
		io.to(connectionId).emit("message", raw);
	},
	disconnect(connectionId) {
		io.sockets.sockets.get(connectionId)?.disconnect(true);
	},
	stop() {
		io.close();
	},
};

const adapter: WaycastAdapter = {
	subscribe(connectionId, topic) {
		io.sockets.sockets.get(connectionId)?.join(topic);
	},
	unsubscribe(connectionId, topic) {
		io.sockets.sockets.get(connectionId)?.leave(topic);
	},
	publish(topic, raw) {
		io.to(topic).emit("message", raw);
	},
	onMessage() {
		// no-op — socket.io already delivered the message above via room broadcast
	},
};

const server = appRouter.buildServer<WSContext>({
	logger,
	transport,
	adapter,
	disposalScheduler: wsDisposalScheduler,
	middlewares: [
		async ({ meta, context, next }) => {
			const allowed = meta?.private?.includes(context.session.role) ?? true;
			if (!allowed) throw new Error("Unauthorized");
			return next();
		},
	],
});

export default { engine, server, io };
