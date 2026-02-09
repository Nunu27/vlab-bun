import { sessions } from "@api/middlewares/auth";
import type { WSContext } from "@api/types/ws";
import { SocketIOServer } from "@jawit/ws";
import { Server as Engine } from "@socket.io/bun-engine";
import contracts from "@vlab/ws";
import { type DefaultEventsMap, Server } from "socket.io";
import parser from "socket.io-msgpack-parser";

const io = new Server<
	DefaultEventsMap,
	DefaultEventsMap,
	DefaultEventsMap,
	WSContext
>({ parser });
const engine = new Engine({ path: "/ws" });
const server = new SocketIOServer<typeof contracts, WSContext>(contracts);

io.bind(engine);

io.use(async (socket, next) => {
	const sessionId = socket.handshake.auth.session;
	if (typeof sessionId !== "string") return next(new Error("Unauthorized"));

	const session = await sessions.get(sessionId);
	if (!session.data) return next(new Error("Unauthorized"));

	socket.data.session = session.data;

	next();
});

server.use(({ socket, meta }, next) => {
	const allowed = meta?.private?.includes(socket.data.session.role) ?? true;
	if (!allowed) return next(new Error("Unauthorized"));
	next();
});

server.attach(io);

export default { engine, server, io };
