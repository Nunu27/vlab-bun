import type { EventEmitter } from "node:events";

export interface TypedEventEmitter<T extends Record<string, unknown[]>>
	extends EventEmitter {
	emit<K extends keyof T>(eventName: K, ...args: T[K]): boolean;
	on<K extends keyof T>(eventName: K, listener: (...args: T[K]) => void): this;
	once<K extends keyof T>(
		eventName: K,
		listener: (...args: T[K]) => void,
	): this;
	off<K extends keyof T>(eventName: K, listener: (...args: T[K]) => void): this;
	removeListener<K extends keyof T>(
		eventName: K,
		listener: (...args: T[K]) => void,
	): this;
	addListener<K extends keyof T>(
		eventName: K,
		listener: (...args: T[K]) => void,
	): this;
}
