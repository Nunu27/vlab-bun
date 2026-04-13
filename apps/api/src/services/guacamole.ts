import { createCipheriv, randomBytes } from "node:crypto";
import type { Server } from "node:http";
import { format } from "node:util";
import env from "@api/env";
import GuacamoleLite, {
	type Callbacks,
	type ClientOptions,
	type ConnectionToken,
	type GuacdOptions,
	type RDPSettings,
	type SSHSettings,
	type TelnetSettings,
	type VNCSettings,
} from "guacamole-lite";
import type { ServerOptions as WSServerOptions } from "ws";
import baseLogger from "./logger";
import redis from "./redis";

const logger = baseLogger.child({ service: "guacamole" });

const SESSION_TTL_SECONDS = 24 * 60 * 60; // 1 day

const websocketOptions: WSServerOptions = {
	port: env.DISPLAY_PORT,
	host: "0.0.0.0",
};

const guacdOptions: GuacdOptions = {
	host: env.GUACD_HOST,
	port: env.GUACD_PORT,
};

const clientOptions = {
	crypt: {
		cypher: "AES-256-CBC",
		key: env.GUACD_SECRET,
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
			"disable-paste": false,
		},
		vnc: {
			"swap-red-blue": false,
			"disable-paste": false,
			"disable-copy": false,
		},
		ssh: {
			"disable-paste": false,
			"disable-copy": false,
			"terminal-type": "vt100",
			scrollback: "1000",
		},
		telnet: {
			"disable-paste": false,
			"disable-copy": false,
			"terminal-type": "vt100",
			scrollback: "1000",
		},
	},
	allowedUnencryptedConnectionSettings: {
		rdp: ["width", "height", "dpi", "audio", "video", "image", "timezone"],
	},
	log: {
		level: "VERBOSE",
		stdLog: (...args) => logger.debug(format(...args)),
		errorLog: (...args) => logger.error(format(...args)),
	},
} satisfies ClientOptions;

const callbacks: Callbacks = {
	processConnectionSettings: (settings, callback) => {
		const expiration = Number(settings.expiration);

		if (!Number.isNaN(expiration) && expiration < Date.now()) {
			logger.warn(
				{ expiration, now: Date.now() },
				"Token expired for connection",
			);
			return callback(new Error("Token expired"), settings);
		}

		callback(null, settings);
	},
	sessionRegistry: {
		async get(id) {
			try {
				const session = await redis.get<ConnectionToken>(`session:guac:${id}`);
				return session ?? undefined;
			} catch (error) {
				logger.error(
					{ error, id },
					"Failed to fetch Guacamole session from Redis",
				);
				return undefined;
			}
		},
		async set(id, sessionData) {
			try {
				await redis.set(`session:guac:${id}`, sessionData, SESSION_TTL_SECONDS);
			} catch (error) {
				logger.error(
					{ error, id },
					"Failed to save Guacamole session to Redis",
				);
			}
		},
		async delete(id) {
			try {
				await redis.del(`session:guac:${id}`);
			} catch (error) {
				logger.error(
					{ error, id },
					"Failed to delete Guacamole session from Redis",
				);
			}
		},
	},
};

let guacServer: GuacamoleLite | null = null;

function initGuacamole(server?: Server) {
	if (guacServer) {
		logger.warn("Guacamole server already initialized");
		return guacServer;
	}

	const options = server ? { server } : websocketOptions;

	guacServer = new GuacamoleLite(
		options,
		guacdOptions,
		clientOptions,
		callbacks,
	);

	guacServer.on("open", (clientConnection) => {
		logger.debug(
			`Connection opened: ${clientConnection.connectionId} (Guac ID: ${clientConnection.guacamoleConnectionId})`,
		);
	});

	guacServer.on("close", (clientConnection, error) => {
		const errorMessage =
			error instanceof Error ? error.message : String(error || "");
		const msg = error
			? `Connection closed: ${clientConnection.connectionId} - ${errorMessage}`
			: `Connection closed: ${clientConnection.connectionId}`;

		logger.debug(msg);
	});

	guacServer.on("error", (clientConnection, error) => {
		logger.error(
			{ error, connectionId: clientConnection?.connectionId },
			"Guacamole connection error",
		);
	});

	const bindTarget = server
		? "attached to HTTP server"
		: `port ${env.DISPLAY_PORT}`;
	logger.info(`Guacamole Server initialized on ${bindTarget}`);

	return guacServer;
}

function getGuacamoleServer() {
	if (!guacServer) {
		throw new Error(
			"Guacamole server not initialized. Call initGuacamole() first.",
		);
	}
	return guacServer;
}

function shutdownGuacamole() {
	if (guacServer) {
		logger.debug("Shutting down Guacamole server...");
		guacServer.close();
		guacServer = null;
	}
}

interface GuacamoleProtocol {
	rdp: RDPSettings;
	vnc: VNCSettings;
	ssh: SSHSettings;
	telnet: TelnetSettings;
}

type GuacamoleConnectionConfig<TType extends keyof GuacamoleProtocol> = {
	type: TType;
	settings: GuacamoleProtocol[TType];
};

function generateToken<TType extends keyof GuacamoleProtocol>(
	tokenObject: GuacamoleConnectionConfig<TType>,
) {
	const iv = randomBytes(16);
	const cipher = createCipheriv(
		clientOptions.crypt.cypher,
		Buffer.from(env.GUACD_SECRET),
		iv,
	);

	let encrypted = cipher.update(
		JSON.stringify({ connection: tokenObject }),
		"utf8",
		"base64",
	);
	encrypted += cipher.final("base64");

	const json = JSON.stringify({
		iv: iv.toString("base64"),
		value: encrypted,
	});
	return Buffer.from(json).toString("base64");
}

export default {
	init: initGuacamole,
	get: getGuacamoleServer,
	shutdown: shutdownGuacamole,
	generateToken,
};
