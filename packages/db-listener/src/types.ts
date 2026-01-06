import type { InferSelectModel } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Logger } from "pino";

export type Operations = "INSERT" | "UPDATE" | "DELETE";

export interface ListenerEntry {
	columns: Set<string>;
	events: Set<Operations>;
	paused: boolean;
	bulk: boolean;
	listener:
		| ListenerCallback<any, any, any>
		| BulkListenerCallback<any, any, any>;
}

export interface BatchItem {
	op: Operations;
	table: string;
	previous: any;
	current: any;
}

export interface BatchQueue {
	items: BatchItem[];
	timer: NodeJS.Timeout | null;
	firstReceivedAt: number;
}

export interface NotificationPayload {
	op: Operations;
	table: string;
	data: Array<{ previous: any; current: any }>;
}

export interface ListenerCallback<
	TTable extends PgTable,
	TOp extends Operations,
	TKeys extends keyof InferSelectModel<TTable>
> {
	(event: {
		op: TOp;
		table: string;
		data: {
			previous: Pick<InferSelectModel<TTable>, TKeys> | null;
			current: Pick<InferSelectModel<TTable>, TKeys> | null;
		};
	}): void | Promise<void>;
}

export interface BulkListenerCallback<
	TTable extends PgTable,
	TOp extends Operations,
	TKeys extends keyof InferSelectModel<TTable>
> {
	(event: {
		op: TOp;
		table: string;
		data: Array<{
			previous: Pick<InferSelectModel<TTable>, TKeys> | null;
			current: Pick<InferSelectModel<TTable>, TKeys> | null;
		}>;
	}): void | Promise<void>;
}

export interface ListenerOptions<
	TOps extends Array<Operations> = [],
	Bulk extends boolean = false
> {
	ops?: TOps;
	paused?: boolean;
	bulk?: Bulk;
}

export interface TriggerInfo {
	channel: string;
	schema: string;
	table: string;
	cols: string[];
	events: Set<Operations>;
}

export interface DBState {
	currentChannels: Set<string>;
	existingTriggers: Set<string>;
}

export interface SyncStats {
	addedTriggers: number;
	droppedTriggers: number;
}

export interface DBListenerConfig {
	batchSize?: number;
	debounceMs?: number;
	maxBatchWaitMs?: number;
	logger?: Logger;
}

export class DBWatcher<TData> {
	private handlers = new Map<string, Set<(data: TData) => void>>();

	on(event: string, listener: (data: TData) => void): this {
		if (!this.handlers.has(event)) {
			this.handlers.set(event, new Set());
		}
		this.handlers.get(event)!.add(listener);
		return this;
	}

	off(event: string, listener: (data: TData) => void): this {
		const handlers = this.handlers.get(event);
		if (handlers) {
			handlers.delete(listener);
			if (handlers.size === 0) {
				this.handlers.delete(event);
			}
		}
		return this;
	}

	emit(event: string, data: TData): void {
		const handlers = this.handlers.get(event);
		if (handlers) {
			handlers.forEach((handler) => handler(data));
		}
	}

	wait<TResult>(
		key: string,
		predicate: (data: TData) => TResult | undefined,
		timeoutMs: number,
		defaultValue: TResult
	): Promise<TResult> {
		return new Promise((resolve) => {
			let resolved = false;

			const timer = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					this.off(key, handler);
					resolve(defaultValue);
				}
			}, timeoutMs);

			const handler = (data: TData) => {
				if (resolved) return;

				const result = predicate(data);

				if (result === undefined) return;

				resolved = true;
				clearTimeout(timer);
				this.off(key, handler);
				resolve(result);
			};

			this.on(key, handler);
		});
	}
}
