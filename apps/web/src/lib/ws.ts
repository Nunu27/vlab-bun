import { SocketIOClient } from "@jawit/ws";
import contracts from "@vlab/ws";
import { useAuthStore } from "@web/stores/auth-store";
import { io } from "socket.io-client";
import parser from "socket.io-msgpack-parser";

const socket = io(window.location.origin, {
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
});

socket.on("connect_error", (err) => {
	console.error("[WebSocket] Connection Error:", err.message);
});

socket.on("error", (data) => {
	console.error("[WebSocket] Error:", data);
});

useAuthStore.subscribe((state) => {
	const user = state.user;

	if (user) socket.connect();
	else socket.disconnect();
});

const ws = new SocketIOClient(contracts);

ws.attach(socket);

export { socket };
export default ws;
