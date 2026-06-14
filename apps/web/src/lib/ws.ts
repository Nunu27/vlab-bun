import appRouter, {
	type ClientToServerEvents,
	type ServerToClientEvents,
} from "@vlab/ws";
import { useAuthStore } from "@web/stores/auth-store";
import { io, type Socket } from "socket.io-client";
import parser from "socket.io-msgpack-parser";

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
	window.location.origin,
	{
		parser,
		path: "/ws",
		autoConnect: false,
		transports: ["websocket", "polling", "webtransport"],
		auth: async (cb) => {
			const session = await cookieStore.get("session");

			return cb({
				session: session?.value,
			});
		},
	},
);

const ws = appRouter.buildClient({
	logger: console,
	send: (message) => {
		socket.emit("rpc", message);
	},
});

socket.on("connect_error", (err) => {
	console.error("[WebSocket] Connection Error:", err.message);
});

socket.on("connect", () => {
	console.log("[WebSocket] Connected");
});

useAuthStore.subscribe((state) => {
	const user = state.user;

	if (user) socket.connect();
	else socket.disconnect();
});

socket.io.on("reconnect", () => ws.resubscribe());
socket.on("data", (msg) => ws.handleData(msg));
socket.on("reply", (msg) => ws.handleReply(msg));
socket.on("disconnect", (reason) => {
	console.log("[WebSocket] Disconnected:", reason);

	if (reason === "io client disconnect") {
		ws.clear();
	} else {
		ws.handleDisconnect();
	}
});

export { socket };
export default ws;
