import type { InferSelectModel } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PgTable } from "drizzle-orm/pg-core";
import type { Pool, PoolClient } from "pg";
import { BatchProcessor } from "./batch-processor";
import {
	DEFAULT_BATCH_SIZE,
	DEFAULT_DEBOUNCE_MS,
	DEFAULT_MAX_BATCH_WAIT_MS
} from "./constants";
import { SyncManager } from "./sync-manager";
import {
	type BulkListenerCallback,
	type DBListenerConfig,
	DBWatcher,
	type ListenerCallback,
	type ListenerEntry,
	type ListenerOptions,
	type NotificationPayload,
	type Operations
} from "./types";
import { areSetsEqual, getChannelForTable, normalizeColumns } from "./utils";

/**
 * Create a DB Listener factory
 * @param db - Drizzle database instance
 * @param config - Configuration options
 * @returns Object with all listener methods
 */
export function createDBListener<
	TSchema extends Record<string, any> = Record<string, any>
>(
	db: NodePgDatabase<TSchema> & { $client: Pool },
	config: DBListenerConfig = {}
) {
	const {
		batchSize = DEFAULT_BATCH_SIZE,
		debounceMs = DEFAULT_DEBOUNCE_MS,
		maxBatchWaitMs = DEFAULT_MAX_BATCH_WAIT_MS,
		logger
	} = config;

	// Initialize client connection
	let client: PoolClient | null = null;
	let isInitialized = false;

	const registry = new Map<string, ListenerEntry[]>();
	const batchProcessor = new BatchProcessor(registry, {
		batchSize: Math.max(1, batchSize),
		debounceMs: Math.max(0, debounceMs),
		maxBatchWaitMs: Math.max(0, maxBatchWaitMs),
		logger
	});

	let syncManager: SyncManager | null = null;

	// Lazy initialization
	const ensureInitialized = async () => {
		if (isInitialized && client) return;

		client = await db.$client.connect();
		syncManager = new SyncManager(client, registry, logger);
		isInitialized = true;

		// Handle PostgreSQL notifications
		client.on("notification", async ({ channel, payload }) => {
			if (!payload || !registry.has(channel)) return;

			let parsedPayload: NotificationPayload;
			try {
				parsedPayload = JSON.parse(payload);
			} catch (error) {
				logger?.error({ error }, `Invalid JSON payload on ${channel}`);
				return;
			}

			if (Array.isArray(parsedPayload.data) && parsedPayload.data.length > 0) {
				batchProcessor.addToBatch(
					channel,
					parsedPayload.op,
					parsedPayload.table,
					parsedPayload.data
				);
			}
		});
	};

	return {
		/**
		 * Add a database listener for table changes
		 */
		addListener<
			TEntity extends keyof TSchema,
			TTable extends TSchema[TEntity],
			TKeys extends keyof InferSelectModel<TTable>,
			TOps extends Array<Operations> = [],
			Bulk extends boolean = false
		>(
			entity: TEntity,
			columns: TKeys[],
			listener: Bulk extends false
				? ListenerCallback<TTable, TOps[number], TKeys>
				: BulkListenerCallback<TTable, TOps[number], TKeys>,
			opts?: ListenerOptions<TOps, Bulk>
		) {
			const table = (db as any)._.fullSchema[entity];
			const channel = getChannelForTable(table);
			const normalizedCols = normalizeColumns(table, columns);
			const listeners = registry.get(channel) ?? [];

			listeners.push({
				columns: new Set(normalizedCols),
				events: new Set(opts?.ops ?? ["INSERT", "UPDATE", "DELETE"]),
				paused: opts?.paused ?? false,
				bulk: opts?.bulk ?? false,
				listener: listener as any
			});

			registry.set(channel, listeners);
		},

		/**
		 * Remove a database listener
		 */
		removeListener<
			TTable extends PgTable,
			TKeys extends keyof InferSelectModel<TTable>,
			TOps extends Array<Operations> = ["INSERT", "UPDATE", "DELETE"]
		>(
			table: TTable,
			columns: TKeys[],
			listener:
				| ListenerCallback<TTable, TOps[number], TKeys>
				| BulkListenerCallback<TTable, TOps[number], TKeys>,
			opts?: { ops?: TOps; bulk?: boolean }
		) {
			const channel = getChannelForTable(table);
			const normalizedCols = normalizeColumns(table, columns);
			const listeners = registry.get(channel);
			if (!listeners) return;

			const opsSet = new Set(opts?.ops ?? ["INSERT", "UPDATE", "DELETE"]);
			const colsSet = new Set(normalizedCols);
			const bulk = opts?.bulk ?? false;

			const listenerIndex = listeners.findIndex(
				(entry) =>
					entry.listener === listener &&
					areSetsEqual(entry.events, opsSet) &&
					areSetsEqual(entry.columns, colsSet) &&
					entry.bulk === bulk
			);

			if (listenerIndex !== -1) {
				listeners.splice(listenerIndex, 1);
			}

			if (listeners.length === 0) {
				registry.delete(channel);
			}
		},

		/**
		 * Sync database channels (LISTEN/UNLISTEN)
		 */
		async syncChannels() {
			await ensureInitialized();
			await syncManager!.syncChannels();
		},

		/**
		 * Sync database listeners (triggers and functions)
		 */
		async syncListeners() {
			await ensureInitialized();
			await syncManager!.syncListeners();
		},

		/**
		 * Flush all pending batches immediately
		 */
		async flush() {
			await batchProcessor.flushAll();
		},

		/**
		 * Cleanup all listeners and pending batches
		 */
		async cleanup() {
			await batchProcessor.flushAll();
			batchProcessor.cleanup();
			if (client) {
				client.removeAllListeners("notification");
			}
		},

		/**
		 * Create a DBWatcher for event-based listening
		 */
		createEventEmitter<
			TData,
			TEntity extends keyof TSchema,
			TTable extends TSchema[TEntity],
			TKeys extends keyof InferSelectModel<TTable>,
			TOps extends Array<Operations> = []
		>(
			entity: TEntity,
			columns: TKeys[],
			keyBuilder: (row: Pick<InferSelectModel<TTable>, TKeys>) => string,
			valueBuilder: (row: Pick<InferSelectModel<TTable>, TKeys>) => TData,
			opts?: { ops?: TOps }
		) {
			const emitter = new DBWatcher<TData>();

			this.addListener(
				entity,
				columns,
				async ({ data }) => {
					const item = (data.current ?? data.previous)!;

					const eventKey = keyBuilder(item);
					const eventValue = valueBuilder(item);

					emitter.emit(eventKey, eventValue);
				},
				{ ops: opts?.ops, bulk: false }
			);

			return emitter;
		}
	};
}

// Re-export types
export { DBWatcher } from "./types";
export type {
	BulkListenerCallback,
	DBListenerConfig,
	ListenerCallback,
	ListenerOptions,
	Operations
} from "./types";
