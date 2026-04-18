/** biome-ignore-all lint/suspicious/noExplicitAny: loose typing */
import type { EventEmitter } from "node:events";

export declare interface RouterOSStream extends EventEmitter {
	cancel(): Promise<void>;
}

export declare class RouterOSClient {
	constructor(host: string, port?: number, timeout?: number);
	connect(): Promise<void>;
	login(username: string, password: string): Promise<any>;
	runQuery<T = any>(
		cmd: string,
		params?: Record<string, string | number | boolean>,
	): Promise<T[]>;
	stream(
		cmd: string,
		params?: Record<string, string | number | boolean>,
	): Promise<RouterOSStream>;
	close(): void;
}

export default RouterOSClient;
