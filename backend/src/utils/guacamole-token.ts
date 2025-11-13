import env from "@backend/env";
import crypto from "node:crypto";

interface ConnectionSettings {
	type?: "rdp" | "vnc" | "ssh" | "telnet";
	join?: string;
	guacdHost?: string;
	guacdPort?: number;
	settings: Record<string, unknown>;
}

interface TokenData {
	connection: ConnectionSettings;
	expiration?: number;
	userId?: string | number;
	[key: string]: unknown;
}

/**
 * Encrypts connection settings into a Guacamole token
 * @param data - The connection data to encrypt
 * @returns Base64-encoded encrypted token
 */
export function encryptGuacamoleToken(data: TokenData): string {
	// Generate random 16-byte IV for AES-256-CBC
	const iv = crypto.randomBytes(16);

	// Create cipher with the secret key
	const cipher = crypto.createCipheriv(
		"aes-256-cbc",
		Buffer.from(env.GUACD_SECRET.slice(0, 32)),
		iv
	);

	// Encrypt the JSON data
	let encrypted = cipher.update(JSON.stringify(data), "utf8", "base64");
	encrypted += cipher.final("base64");

	// Create the token structure
	const token = {
		iv: iv.toString("base64"),
		value: encrypted
	};

	// Base64 encode the entire token
	return Buffer.from(JSON.stringify(token)).toString("base64");
}

/**
 * Decrypts a Guacamole token (for testing/debugging purposes)
 * @param token - The Base64-encoded encrypted token
 * @returns Decrypted token data
 */
export function decryptGuacamoleToken(token: string): TokenData {
	// Decode the outer base64
	const tokenObj = JSON.parse(Buffer.from(token, "base64").toString("utf8"));

	// Extract IV and encrypted value
	const iv = Buffer.from(tokenObj.iv, "base64");
	const encrypted = tokenObj.value;

	// Create decipher
	const decipher = crypto.createDecipheriv(
		"aes-256-cbc",
		Buffer.from(env.GUACD_SECRET.slice(0, 32)),
		iv
	);

	// Decrypt
	let decrypted = decipher.update(encrypted, "base64", "utf8");
	decrypted += decipher.final("utf8");

	return JSON.parse(decrypted);
}

/**
 * Creates a connection token for RDP
 */
export function createRdpToken(
	hostname: string,
	username: string,
	password: string,
	options?: {
		port?: number;
		width?: number;
		height?: number;
		dpi?: number;
		userId?: string | number;
		expiresIn?: number; // milliseconds
		[key: string]: unknown;
	}
): string {
	const data: TokenData = {
		connection: {
			type: "rdp",
			settings: {
				hostname,
				username,
				password,
				port: options?.port?.toString() || "3389",
				...(options?.width && { width: options.width }),
				...(options?.height && { height: options.height }),
				...(options?.dpi && { dpi: options.dpi })
			}
		},
		...(options?.userId && { userId: options.userId }),
		...(options?.expiresIn && { expiration: Date.now() + options.expiresIn })
	};

	return encryptGuacamoleToken(data);
}

/**
 * Creates a connection token for VNC
 */
export function createVncToken(
	hostname: string,
	password: string,
	options?: {
		port?: number;
		width?: number;
		height?: number;
		dpi?: number;
		userId?: string | number;
		expiresIn?: number;
		[key: string]: unknown;
	}
): string {
	const data: TokenData = {
		connection: {
			type: "vnc",
			settings: {
				hostname,
				password,
				port: options?.port?.toString() || "5900",
				...(options?.width && { width: options.width }),
				...(options?.height && { height: options.height }),
				...(options?.dpi && { dpi: options.dpi })
			}
		},
		...(options?.userId && { userId: options.userId }),
		...(options?.expiresIn && { expiration: Date.now() + options.expiresIn })
	};

	return encryptGuacamoleToken(data);
}

/**
 * Creates a token to join an existing connection
 */
export function createJoinToken(
	sessionId: string,
	options?: {
		readOnly?: boolean;
		width?: number;
		height?: number;
		dpi?: number;
		userId?: string | number;
		expiresIn?: number;
		[key: string]: unknown;
	}
): string {
	const data: TokenData = {
		connection: {
			join: sessionId,
			settings: {
				...(options?.readOnly !== undefined && {
					"read-only": options.readOnly
				}),
				...(options?.width && { width: options.width }),
				...(options?.height && { height: options.height }),
				...(options?.dpi && { dpi: options.dpi })
			}
		},
		...(options?.userId && { userId: options.userId }),
		...(options?.expiresIn && { expiration: Date.now() + options.expiresIn })
	};

	return encryptGuacamoleToken(data);
}

export default {
	encryptGuacamoleToken,
	decryptGuacamoleToken,
	createRdpToken,
	createVncToken,
	createJoinToken
};
