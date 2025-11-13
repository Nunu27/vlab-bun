import env from "@backend/env";
import logger from "@backend/services/logger";
import redis from "@backend/services/redis";
import GuacamoleLite from "guacamole-lite";
import type { Server } from "node:http";

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
	async get(sessionId: string): Promise<GuacamoleSessionData | null> {
		return redis.get<GuacamoleSessionData>(`guac-session:${sessionId}`);
	},
	async set(
		sessionId: string,
		sessionData: GuacamoleSessionData
	): Promise<void> {
		await redis.set(`guac-session:${sessionId}`, sessionData, 86400);
	},
	async delete(sessionId: string): Promise<void> {
		await redis.del(`guac-session:${sessionId}`);
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
			video: null,
			image: ["image/png", "image/jpeg"],
			timezone: null
		},
		vnc: {
			"swap-red-blue": false,
			"disable-paste": false
		}
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
			logger.info(`[Guacamole] ${args.join(" ")}`);
		},
		errorLog: (...args: unknown[]) => {
			logger.error(`[Guacamole] ${args.join(" ")}`);
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
		logger.warn("[Guacamole] server already initialized");
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
		logger.info(
			`[Guacamole] connection opened: ${clientConnection.connectionId} (${clientConnection.guacamoleConnectionId})`
		);
	});

	guacServer.on("close", (clientConnection: any, error?: Error) => {
		const msg = error
			? `[Guacamole] connection closed: ${clientConnection.connectionId} - ${error.message}`
			: `[Guacamole] connection closed: ${clientConnection.connectionId}`;
		logger.info(msg);
	});

	guacServer.on("error", (clientConnection: any, error: Error) => {
		logger.error(
			{ error },
			`[Guacamole] connection error: ${clientConnection.connectionId}`
		);
	});

	const port = server ? "attached to HTTP server" : env.DISPLAY_PORT;
	logger.info(`[Guacamole] server initialized on ${port}`);

	return guacServer;
}

export function getGuacamoleServer() {
	if (!guacServer) {
		throw new Error("[Guacamole] server not initialized");
	}
	return guacServer;
}

export async function shutdownGuacamole() {
	if (guacServer) {
		logger.info("Shutting down Guacamole server...");
		guacServer = null;
	}
}

export default { initGuacamole, getGuacamoleServer, shutdownGuacamole };
