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

const ws = appRouter.buildClient({
	logger: console,
	send: (message) => {
		socket.emit("rpc", message);
	},
});

socket.on("data", (msg) => ws.handleData(msg));
socket.on("reply", (msg) => ws.handleReply(msg));

export { socket };
export default ws;
