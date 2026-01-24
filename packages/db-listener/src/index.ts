import type { InferSelectModel, ExtractTablesWithRelations } from "drizzle-orm";
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

export interface DBListener<TSchema extends Record<string, any>> {
	addListener<
		TEntity extends keyof ExtractTablesWithRelations<TSchema>,
		TTable extends TSchema[TEntity] extends PgTable
			? TSchema[TEntity]
			: PgTable,
		TKeys extends keyof InferSelectModel<TTable>,
		TOps extends Array<Operations>,
		Bulk extends boolean
	>(
		entity: TEntity,
		columns: TKeys[],
		listener: Bulk extends false
			? ListenerCallback<TTable, TOps[number], TKeys>
			: BulkListenerCallback<TTable, TOps[number], TKeys>,
		opts?: ListenerOptions<TOps, Bulk>
	): void;

	removeListener<
		TTable extends PgTable,
		TKeys extends keyof InferSelectModel<TTable>,
		TOps extends Array<Operations>
	>(
		table: TTable,
		columns: TKeys[],
		listener:
			| ListenerCallback<TTable, TOps[number], TKeys>
			| BulkListenerCallback<TTable, TOps[number], TKeys>,
		opts?: { ops?: TOps; bulk?: boolean }
	): void;

	syncChannels(): Promise<void>;
	syncListeners(): Promise<void>;
	flush(): Promise<void>;
	cleanup(): Promise<void>;

	createEventEmitter<
		TData,
		TEntity extends keyof ExtractTablesWithRelations<TSchema>,
		TTable extends TSchema[TEntity] extends PgTable
			? TSchema[TEntity]
			: PgTable,
		TKeys extends keyof InferSelectModel<TTable>,
		TOps extends Array<Operations>
	>(
		entity: TEntity,
		columns: TKeys[],
		keyBuilder: (row: Pick<InferSelectModel<TTable>, TKeys>) => string,
		valueBuilder: (row: Pick<InferSelectModel<TTable>, TKeys>) => TData,
		opts?: { ops?: TOps }
	): DBWatcher<TData>;
}

export function createDBListener<
	TSchema extends Record<string, any> = Record<string, any>
>(
	db: NodePgDatabase<TSchema> & { $client: Pool },
	config: DBListenerConfig = {}
): DBListener<TSchema> {
	const {
		batchSize = DEFAULT_BATCH_SIZE,
		debounceMs = DEFAULT_DEBOUNCE_MS,
		maxBatchWaitMs = DEFAULT_MAX_BATCH_WAIT_MS,
		logger
	} = config;

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

	const ensureInitialized = async () => {
		if (isInitialized && client) return;

		client = await db.$client.connect();
		syncManager = new SyncManager(client, registry, logger);
		isInitialized = true;

		client.on("notification", ({ channel, payload }) => {
			if (!payload || !registry.has(channel)) return;

			let parsed: NotificationPayload;
			try {
				parsed = JSON.parse(payload);
			} catch (error) {
				logger?.error({ error }, `Invalid JSON payload on ${channel}`);
				return;
			}

			if (Array.isArray(parsed.data) && parsed.data.length > 0) {
				batchProcessor.addToBatch(
					channel,
					parsed.op,
					parsed.table,
					parsed.data
				);
			}
		});
	};

	return {
		addListener<
			TEntity extends keyof ExtractTablesWithRelations<TSchema>,
			TTable extends TSchema[TEntity] extends PgTable
				? TSchema[TEntity]
				: PgTable,
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
			const tableConfig = (db as any)._.schema![entity];
			const { columns: tableCols } = tableConfig;
			const table = (Object.values(tableCols)[0] as any).table as TTable;
			const channel = getChannelForTable(table);
			const normalizedCols = normalizeColumns(table, columns);

			const entry: ListenerEntry = {
				columns: new Set(normalizedCols),
				events: new Set(opts?.ops ?? ["INSERT", "UPDATE", "DELETE"]),
				paused: opts?.paused ?? false,
				bulk: opts?.bulk ?? false,
				listener: listener as any
			};

			const listeners = registry.get(channel) ?? [];
			listeners.push(entry);
			registry.set(channel, listeners);
		},

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

			const index = listeners.findIndex(
				(entry) =>
					entry.listener === listener &&
					areSetsEqual(entry.events, opsSet) &&
					areSetsEqual(entry.columns, colsSet) &&
					entry.bulk === bulk
			);

			if (index !== -1) {
				listeners.splice(index, 1);
			}

			if (listeners.length === 0) {
				registry.delete(channel);
			}
		},

		async syncChannels() {
			await ensureInitialized();
			await syncManager!.syncChannels();
		},

		async syncListeners() {
			await ensureInitialized();
			await syncManager!.syncListeners();
		},

		async flush() {
			await batchProcessor.flushAll();
		},

		async cleanup() {
			await batchProcessor.flushAll();
			batchProcessor.cleanup();
			if (client) {
				client.removeAllListeners("notification");
			}
		},

		createEventEmitter<
			TData,
			TEntity extends keyof ExtractTablesWithRelations<TSchema>,
			TTable extends TSchema[TEntity] extends PgTable
				? TSchema[TEntity]
				: PgTable,
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

export { DBWatcher } from "./types";
export type {
	BulkListenerCallback,
	DBListenerConfig,
	ListenerCallback,
	ListenerOptions,
	Operations
} from "./types";
