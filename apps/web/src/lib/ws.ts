import appRouter from "@vlab/ws";
import { useAuthStore } from "@web/stores/auth-store";
import { io, type Socket } from "socket.io-client";
import parser from "socket.io-msgpack-parser";
import type { WaycastClientTransport } from "waycast";

type ClientToServerEvents = { message: (raw: string) => void };
type ServerToClientEvents = { message: (raw: string) => void };

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

const transport: WaycastClientTransport = {
	connect({ onOpen, onMessage, onClose }) {
		socket.on("connect", onOpen);
		socket.on("message", onMessage);
		socket.on("disconnect", onClose);
	},
	send(raw) {
		socket.emit("message", raw);
	},
	disconnect() {
		socket.disconnect();
	},
};

const ws = appRouter.buildClient({
	logger: console,
	transport,
});

socket.on("connect_error", (err) => {
	console.error("[WebSocket] Connection Error:", err.message);
});

socket.on("connect", () => {
	console.log("[WebSocket] Connected");
});

socket.on("disconnect", (reason) => {
	console.log("[WebSocket] Disconnected:", reason);
});

useAuthStore.subscribe((state) => {
	const user = state.user;

	if (user) socket.connect();
	else socket.disconnect();
});

export { socket };
export default ws;
