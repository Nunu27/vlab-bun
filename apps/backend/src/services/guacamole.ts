import env from "@backend/env";
import redis from "@backend/services/redis";
import type {
	RDPParameters,
	SSHParameters,
	TelnetParameters,
	VNCParameters
} from "@backend/types/guacamole";
import GuacamoleLite from "guacamole-lite";
import type { Server } from "node:http";
import { childLogger } from "./logger";

const logger = childLogger("guacamole");

interface GuacamoleSessionData {
	guacdHost: string;
	guacdPort: number;
	connectionInfo: {
		type: string;
		guacdHost?: string;
		guacdPort?: number;
		settings: Record<string, unknown>;
	};
	createdAt: string;
	joinedConnections: Array<{
		connectionId: number;
		guacamoleConnectionId: string;
		joinedAt: string;
		joinSettings: Record<string, unknown>;
	}>;
}

const sessionRegistry = {
	async get(sessionId: string) {
		return redis.get<GuacamoleSessionData>(`session:guac:${sessionId}`);
	},
	async set(sessionId: string, sessionData: GuacamoleSessionData) {
		await redis.set(`session:guac:${sessionId}`, sessionData, 86400);
	},
	async delete(sessionId: string) {
		await redis.del(`session:guac:${sessionId}`);
	}
};

const websocketOptions = {
	port: env.DISPLAY_PORT,
	host: "0.0.0.0"
};

const guacdOptions = {
	host: env.GUACD_HOST,
	port: env.GUACD_PORT
};

const clientOptions = {
	crypt: {
		cypher: "AES-256-CBC",
		key: env.GUACD_SECRET
	},
	connectionDefaultSettings: {
		rdp: {
			"create-drive-path": true,
			security: "any",
			"ignore-cert": true,
			"enable-wallpaper": false,
			"create-recording-path": true,
			audio: ["audio/L16"],
			image: ["image/png", "image/jpeg"],
			"resize-method": "display-update",
			"disable-copy": false,
			"disable-paste": false
		} as Omit<RDPParameters, "hostname">,
		vnc: {
			"swap-red-blue": false,
			"disable-paste": false,
			"disable-copy": false
		} as Omit<VNCParameters, "hostname">,
		ssh: {
			"swap-red-blue": false,
			"disable-paste": false,
			"disable-copy": false,
			"terminal-type": "vt100",
			scrollback: "1000"
		} as Omit<SSHParameters, "hostname">,
		telnet: {
			"swap-red-blue": false,
			"disable-paste": false,
			"disable-copy": false,
			"terminal-type": "vt100",
			scrollback: "1000"
		} as Omit<TelnetParameters, "hostname">
	},
	allowedUnencryptedConnectionSettings: {
		rdp: ["width", "height", "dpi", "audio", "video", "image", "timezone"],
		vnc: ["width", "height", "dpi", "audio", "video", "image", "timezone"],
		join: [
			"read-only",
			"width",
			"height",
			"dpi",
			"audio",
			"video",
			"image",
			"timezone"
		]
	},
	log: {
		level: "VERBOSE" as const,
		stdLog: (...args: unknown[]) => {
			logger.debug(`${args.join(" ")}`);
		},
		errorLog: (...args: unknown[]) => {
			logger.error(`${args.join(" ")}`);
		}
	}
};

const callbacks = {
	processConnectionSettings: (
		settings: Record<string, unknown>,
		callback: (error: Error | null, settings?: Record<string, unknown>) => void
	) => {
		if (settings.expiration && typeof settings.expiration === "number") {
			if (settings.expiration < Date.now()) {
				logger.error("Token expired for connection");
				return callback(new Error("Token expired"));
			}
		}

		callback(null, settings);
	},
	sessionRegistry
};

let guacServer: GuacamoleLite | null = null;

export function initGuacamole(server?: Server) {
	if (guacServer) {
		logger.warn("server already initialized");
		return guacServer;
	}

	const options = server ? { server } : websocketOptions;

	guacServer = new GuacamoleLite(
		options,
		guacdOptions,
		clientOptions,
		callbacks
	);

	// Event handlers
	guacServer.on("open", (clientConnection: any) => {
		logger.debug(
			`connection opened: ${clientConnection.connectionId} (${clientConnection.guacamoleConnectionId})`
		);
	});

	guacServer.on("close", (clientConnection: any, error?: Error) => {
		const msg = error
			? `connection closed: ${clientConnection.connectionId} - ${error.message}`
			: `connection closed: ${clientConnection.connectionId}`;
		logger.debug(msg);
	});

	guacServer.on("error", (clientConnection: any, error: Error) => {
		logger.error(
			{ error },
			`connection error: ${clientConnection.connectionId}`
		);
	});

	const port = server ? "attached to HTTP server" : env.DISPLAY_PORT;
	logger.info(`server initialized on ${port}`);

	return guacServer;
}

export function getGuacamoleServer() {
	if (!guacServer) {
		throw new Error("server not initialized");
	}
	return guacServer;
}

export async function shutdownGuacamole() {
	if (guacServer) {
		logger.debug("Shutting down Guacamole server...");
		guacServer = null;
	}
}

export default { initGuacamole, getGuacamoleServer, shutdownGuacamole };
