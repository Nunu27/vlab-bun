declare module "guacamole-lite" {
	import type { Server } from "node:http";

	interface WebSocketOptions {
		port?: number;
		host?: string;
		server?: Server;
	}

	interface GuacdOptions {
		host?: string;
		port?: number;
	}

	interface CryptOptions {
		cypher: string;
		key: string;
	}

	interface LogOptions {
		level?: "QUIET" | "ERRORS" | "NORMAL" | "VERBOSE" | "DEBUG";
		stdLog?: (...args: any[]) => void;
		errorLog?: (...args: any[]) => void;
	}

	interface ClientOptions {
		crypt?: CryptOptions;
		connectionDefaultSettings?: Record<string, Record<string, any>>;
		allowedUnencryptedConnectionSettings?: Record<string, string[]>;
		log?: LogOptions;
	}

	interface Callbacks {
		processConnectionSettings?: (
			settings: Record<string, any>,
			callback: (error: Error | null, settings?: Record<string, any>) => void
		) => void;
		sessionRegistry?: {
			get(sessionId: string): Promise<any> | any;
			set(sessionId: string, sessionData: any): Promise<void> | void;
			delete(sessionId: string): Promise<void> | void;
		};
	}

	interface ClientConnection {
		connectionId: number;
		guacamoleConnectionId?: string;
		connectionSettings: Record<string, any>;
	}

	class GuacamoleLite {
		constructor(
			websocketOptions: WebSocketOptions,
			guacdOptions?: GuacdOptions,
			clientOptions?: ClientOptions,
			callbacks?: Callbacks
		);

		on(
			event: "open",
			listener: (clientConnection: ClientConnection) => void
		): this;
		on(
			event: "close",
			listener: (clientConnection: ClientConnection, error?: Error) => void
		): this;
		on(
			event: "error",
			listener: (clientConnection: ClientConnection, error: Error) => void
		): this;
	}

	export = GuacamoleLite;
}
