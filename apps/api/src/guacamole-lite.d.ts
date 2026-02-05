declare module "guacamole-lite" {
	import { EventEmitter } from "node:events";
	import type { IncomingMessage } from "node:http";
	import type {
		WebSocket,
		Server as WebSocketServer,
		ServerOptions as WSServerOptions,
	} from "ws";

	export interface GuacdOptions {
		host?: string;
		port?: number;
	}

	export interface LogOptions {
		level?: "QUIET" | "ERRORS" | "NORMAL" | "VERBOSE" | "DEBUG" | number;
		stdLog?: (...args: unknown[]) => void;
		errorLog?: (...args: unknown[]) => void;
		verbose?: boolean;
	}

	export interface CryptOptions {
		cypher?: string;
		key: string;
	}

	// Common Base Settings across multiple protocols
	export interface BaseProtocolSettings {
		hostname?: string;
		port?: number | string;
		username?: string;
		password?: string;
		"read-only"?: boolean | string;

		// Clipboard
		"clipboard-buffer-size"?: number | string;
		"disable-copy"?: boolean | string;
		"disable-paste"?: boolean | string;

		// Wake on LAN (WoL)
		"wol-send-packet"?: boolean | string;
		"wol-mac-addr"?: string;
		"wol-broadcast-addr"?: string;
		"wol-udp-port"?: number | string;
		"wol-wait-time"?: number | string;

		// Recording
		"recording-path"?: string;
		"recording-name"?: string;
		"recording-exclude-output"?: boolean | string;
		"recording-exclude-mouse"?: boolean | string;
		"recording-include-keys"?: boolean | string;
		"create-recording-path"?: boolean | string;
		"recording-write-existing"?: boolean | string;
	}

	// SFTP Settings used by RDP, VNC, and SSH
	export interface SFTPSettings {
		"enable-sftp"?: boolean | string;
		"sftp-hostname"?: string;
		"sftp-host-key"?: string;
		"sftp-port"?: number | string;
		"sftp-timeout"?: number | string;
		"sftp-username"?: string;
		"sftp-password"?: string;
		"sftp-private-key"?: string;
		"sftp-passphrase"?: string;
		"sftp-public-key"?: string;
		"sftp-directory"?: string;
		"sftp-root-directory"?: string;
		"sftp-server-alive-interval"?: number | string;
		"sftp-disable-download"?: boolean | string;
		"sftp-disable-upload"?: boolean | string;
	}

	export interface RDPSettings extends BaseProtocolSettings, SFTPSettings {
		domain?: string;
		timeout?: number | string;
		width?: number | string;
		height?: number | string;
		dpi?: number | string;
		"initial-program"?: string;
		"color-depth"?: number | string;
		"disable-audio"?: boolean | string;
		"enable-printing"?: boolean | string;
		"printer-name"?: string;
		"enable-drive"?: boolean | string;
		"drive-name"?: string;
		"drive-path"?: string;
		"create-drive-path"?: boolean | string;
		"disable-download"?: boolean | string;
		"disable-upload"?: boolean | string;
		console?: boolean | string;
		"console-audio"?: boolean | string;
		"server-layout"?: string;
		security?: "rdp" | "tls" | "nla" | "nla-ext" | "vmconnect" | "any";
		"ignore-cert"?: boolean | string;
		"cert-tofu"?: boolean | string;
		"cert-fingerprints"?: string;
		"disable-auth"?: boolean | string;
		"remote-app"?: string;
		"remote-app-dir"?: string;
		"remote-app-args"?: string;
		"static-channels"?: string;
		"client-name"?: string;
		"enable-wallpaper"?: boolean | string;
		"enable-theming"?: boolean | string;
		"enable-font-smoothing"?: boolean | string;
		"enable-full-window-drag"?: boolean | string;
		"enable-desktop-composition"?: boolean | string;
		"enable-menu-animations"?: boolean | string;
		"disable-bitmap-caching"?: boolean | string;
		"disable-offscreen-caching"?: boolean | string;
		"disable-glyph-caching"?: boolean | string;
		"disable-gfx"?: boolean | string;
		"preconnection-id"?: number | string;
		"preconnection-blob"?: string;
		timezone?: string;
		"recording-exclude-touch"?: boolean | string;
		"resize-method"?: "display-update" | "reconnect" | "";
		"enable-audio-input"?: boolean | string;
		"enable-touch"?: boolean | string;
		"gateway-hostname"?: string;
		"gateway-port"?: number | string;
		"gateway-domain"?: string;
		"gateway-username"?: string;
		"gateway-password"?: string;
		"load-balance-info"?: string;
		"force-lossless"?: boolean | string;
		"normalize-clipboard"?: "preserve" | "windows" | "unix";
		audio?: string[];
		video?: string[];
		image?: string[];
	}

	export interface VNCSettings extends BaseProtocolSettings, SFTPSettings {
		"disable-display-resize"?: boolean | string;
		encodings?: string;
		"swap-red-blue"?: boolean | string;
		"color-depth"?: number | string;
		cursor?: "remote" | "local" | string;
		autoretry?: number | string;
		"clipboard-encoding"?: "ISO8829-1" | "UTF-8" | "UTF-16" | "CP2252" | string;
		"dest-host"?: string;
		"dest-port"?: number | string;
		"enable-audio"?: boolean | string;
		"audio-servername"?: string;
		"reverse-connect"?: boolean | string;
		"listen-timeout"?: number | string;
		"disable-server-input"?: boolean | string;
		"force-lossless"?: boolean | string;
		"compress-level"?: number | string; // 0 to 9
		"quality-level"?: number | string; // 0 to 9
		audio?: string[];
		video?: string[];
		image?: string[];
	}

	export interface SSHSettings extends BaseProtocolSettings, SFTPSettings {
		"host-key"?: string;
		timeout?: number | string;
		"font-name"?: string;
		"font-size"?: number | string;
		"private-key"?: string;
		passphrase?: string;
		"public-key"?: string;
		"enable-agent"?: boolean | string;
		"color-scheme"?: string;
		command?: string;
		"typescript-path"?: string;
		"typescript-name"?: string;
		"create-typescript-path"?: boolean | string;
		"typescript-write-existing"?: boolean | string;
		"server-alive-interval"?: number | string;
		backspace?: number | string;
		"func-keys-and-keypad"?: string;
		"terminal-type"?: string;
		scrollback?: number | string;
		locale?: string;
		timezone?: string;
		audio?: string[];
		video?: string[];
		image?: string[];
	}

	export interface TelnetSettings extends BaseProtocolSettings {
		timeout?: number | string;
		"username-regex"?: string;
		"password-regex"?: string;
		"font-name"?: string;
		"font-size"?: number | string;
		"color-scheme"?: string;
		"typescript-path"?: string;
		"typescript-name"?: string;
		"create-typescript-path"?: boolean | string;
		"typescript-write-existing"?: boolean | string;
		backspace?: number | string;
		"func-keys-and-keypad"?: string;
		"terminal-type"?: string;
		scrollback?: number | string;
		"login-success-regex"?: string;
		"login-failure-regex"?: string;
		audio?: string[];
		video?: string[];
		image?: string[];
	}

	// Extends partials of all protocols so we don't need strict casting for edge-cases
	export type GuacamoleConnectionSettings = Partial<
		RDPSettings &
			VNCSettings &
			SSHSettings &
			TelnetSettings &
			Record<string, string | number | boolean>
	>;

	export interface ConnectionToken {
		connection?: {
			type?: "rdp" | "vnc" | "ssh" | "telnet" | string;
			settings?: GuacamoleConnectionSettings;
		};
		[key: string]: unknown; // For custom metadata encoded in the token
	}

	export interface ConnectionDefaultSettings {
		rdp?: RDPSettings;
		vnc?: VNCSettings;
		ssh?: SSHSettings;
		telnet?: TelnetSettings;
		join?: GuacamoleConnectionSettings;
	}

	export interface AllowedUnencryptedConnectionSettings {
		rdp?: Array<keyof RDPSettings>;
		vnc?: Array<keyof VNCSettings>;
		ssh?: Array<keyof SSHSettings>;
		telnet?: Array<keyof TelnetSettings>;
		join?: string[];
	}

	export interface ClientOptions {
		maxInactivityTime?: number;
		log?: LogOptions;
		crypt?: CryptOptions;
		connectionDefaultSettings?: ConnectionDefaultSettings;
		allowedUnencryptedConnectionSettings?: AllowedUnencryptedConnectionSettings;
	}

	export interface SessionRegistryStore {
		get(
			key: string,
		): ConnectionToken | Promise<ConnectionToken | undefined> | undefined;
		set(key: string, value: ConnectionToken): void | Promise<void>;
		delete(key: string): void | Promise<void>;
	}

	export interface Callbacks {
		processConnectionSettings?: (
			settings: GuacamoleConnectionSettings,
			callback: (
				err: Error | null | undefined,
				settings: GuacamoleConnectionSettings,
			) => void,
		) => void;
		sessionRegistry?: SessionRegistryStore | Map<string, ConnectionToken>;
	}

	// Query parameters parsed from the connection URL
	export type GuacamoleQuery = Record<string, string | string[] | undefined>;

	export class ClientConnection extends EventEmitter {
		state: number;
		connectionId: number;
		guacamoleConnectionId?: string;
		webSocket: WebSocket;
		query: GuacamoleQuery;
		lastActivity: number;
		connectionSettings: GuacamoleConnectionSettings;

		constructor(
			clientOptions: ClientOptions,
			connectionId: number,
			webSocket: WebSocket,
			query: GuacamoleQuery,
			callbacks: Callbacks,
		);

		sendErrorToClient(message: string, errorCode?: string): void;
		connect(guacdOptions: GuacdOptions): void;
		handleGuacdError(error: Error | unknown): void;
		decryptToken(): ConnectionToken;
		close(error?: Error | unknown): void;
		sendMessageToGuacd(message: string): void;
		send(message: string): void;
		mergeConnectionOptions(): GuacamoleConnectionSettings;
		checkActivity(): void;

		on(event: "ready", listener: (clientConnection: this) => void): this;
		on(
			event: "close",
			listener: (clientConnection: this, error?: unknown) => void,
		): this;
		on(event: string | symbol, listener: (...args: unknown[]) => void): this;
	}

	export default class Server extends EventEmitter {
		wsOptions: WSServerOptions;
		defaultGuacdOptions: GuacdOptions;
		clientOptions: ClientOptions;
		callbacks: Callbacks;
		sessionRegistry: SessionRegistryStore | Map<string, ConnectionToken>;
		connectionsCount: number;
		activeConnections: Map<number, ClientConnection>;
		webSocketServer: WebSocketServer;

		constructor(
			wsOptions: WSServerOptions,
			guacdOptions: GuacdOptions,
			clientOptions: ClientOptions,
			callbacks?: Callbacks,
		);

		handleServerError(
			clientConnection: ClientConnection | null,
			error: Error,
		): void;
		close(): void;
		extractGuacdOptions(query: GuacamoleQuery): Promise<{
			guacdOptions: GuacdOptions;
			connectionInfo: ConnectionToken;
			isJoin: boolean;
			targetSessionId: string | null;
		}>;
		handleSessionJoin(sessionUUID: string): Promise<GuacdOptions>;
		decryptToken(encryptedToken: string): ConnectionToken;
		newConnection(
			webSocketConnection: WebSocket,
			request: IncomingMessage,
		): Promise<void>;

		on(
			event: "open",
			listener: (clientConnection: ClientConnection) => void,
		): this;
		on(
			event: "close",
			listener: (clientConnection: ClientConnection, error?: unknown) => void,
		): this;
		on(
			event: "error",
			listener: (
				clientConnection: ClientConnection | null,
				error: Error,
			) => void,
		): this;
		on(event: string | symbol, listener: (...args: unknown[]) => void): this;
	}
}
