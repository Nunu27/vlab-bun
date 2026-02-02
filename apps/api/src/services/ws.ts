import { SocketIOServer, WSContracts } from "@jawit/ws";
import { Type } from "@sinclair/typebox";
import { Server } from "socket.io";

// Define your initial WebSocket contracts here
export const wsContracts = new WSContracts().register({
	event: "ping",
	type: "client2server",
	data: Type.Object({ timestamp: Type.Number() }),
});

// Initialize the WebSocket Server using the Socket.IO Adapter
export const wsServer = new SocketIOServer(wsContracts);

// Middleware Example globally checking contracts
wsServer.use((socket, meta) => {
	// e.g., if (meta?.admin && socket.data.session.role !== "admin") return false;
	return true;
});

// Since @jawit/ws purely acts as an attachment pattern,
// you maintain 100% control over the underlying Server instantiation!
export const initWS = () => {
	// Import engine from bun specific implementation
	// import { Engine } from "@socket.io/bun-engine";
	// const engine = new Engine({ path: "/ws" });

	const io = new Server({
		cors: { origin: "*" },
	});

	// io.bind(engine)
	//
	// io.use(async (socket, next) => {
	// 	const sessionId: string | undefined = socket.handshake.auth.session;
	// 	if (!sessionId) return next(new Error("Unauthorized"));
	// 	socket.data.session = { role: "user" };
	// 	next();
	// });

	// Bootstraps @jawit/ws handlers onto your native instance
	wsServer.attach(io);

	return io;
};
