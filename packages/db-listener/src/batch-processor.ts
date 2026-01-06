import type {
	BatchQueue,
	ListenerEntry,
	Operations,
	BulkListenerCallback,
	ListenerCallback,
	DBListenerConfig
} from "./types";
import { filterRowByColumns } from "./utils";

export class BatchProcessor {
	private batchQueue = new Map<string, BatchQueue>();
	private registry: Map<string, ListenerEntry[]>;
	private batchSize: number;
	private debounceMs: number;
	private maxBatchWaitMs: number;
	private logger: DBListenerConfig["logger"];

	constructor(
		registry: Map<string, ListenerEntry[]>,
		config: Required<
			Pick<DBListenerConfig, "batchSize" | "debounceMs" | "maxBatchWaitMs">
		> &
			Pick<DBListenerConfig, "logger">
	) {
		this.registry = registry;
		this.batchSize = config.batchSize;
		this.debounceMs = config.debounceMs;
		this.maxBatchWaitMs = config.maxBatchWaitMs;
		this.logger = config.logger;
	}

	addToBatch(
		channel: string,
		op: Operations,
		table: string,
		rowData: Array<{ previous: any; current: any }>
	): void {
		if (!this.batchQueue.has(channel)) {
			this.batchQueue.set(channel, {
				items: [],
				timer: null,
				firstReceivedAt: Date.now()
			});
		}

		const batch = this.batchQueue.get(channel)!;

		rowData.forEach((data) => {
			batch.items.push({
				op,
				table,
				previous: data.previous || null,
				current: data.current || null
			});
		});

		this.scheduleBatchProcessing(channel);
	}

	private scheduleBatchProcessing(channel: string): void {
		const batch = this.batchQueue.get(channel);
		if (!batch) return;

		const now = Date.now();
		const timeSinceFirst = now - batch.firstReceivedAt;

		if (batch.timer) {
			clearTimeout(batch.timer);
		}

		if (timeSinceFirst >= this.maxBatchWaitMs) {
			this.processBatch(channel);
			return;
		}

		const remainingWait = Math.min(
			this.debounceMs,
			this.maxBatchWaitMs - timeSinceFirst
		);

		batch.timer = setTimeout(() => {
			this.processBatch(channel);
		}, remainingWait);
	}

	async processBatch(channel: string): Promise<void> {
		const batch = this.batchQueue.get(channel);
		if (!batch || batch.items.length === 0) return;

		const items = batch.items.slice();
		this.batchQueue.delete(channel);

		const listeners = this.registry.get(channel);
		if (!listeners) return;

		// Filter out paused listeners
		const activeListeners = listeners.filter((l) => !l.paused);
		if (activeListeners.length === 0) return;

		const groupedByOp = items.reduce(
			(acc, item) => {
				if (!acc[item.op]) acc[item.op] = [];
				acc[item.op].push(item);
				return acc;
			},
			{} as Record<Operations, typeof items>
		);

		for (const [op, opItems] of Object.entries(groupedByOp)) {
			const listenersToCall = activeListeners.filter(({ events }) =>
				events.has(op as Operations)
			);

			if (listenersToCall.length === 0) continue;

			const bulkListeners = listenersToCall.filter(({ bulk }) => bulk);
			const nonBulkListeners = listenersToCall.filter(({ bulk }) => !bulk);

			if (bulkListeners.length > 0) {
				await this.processBulkListeners(
					bulkListeners,
					op as Operations,
					opItems,
					channel
				);
			}

			if (nonBulkListeners.length > 0) {
				await this.processNonBulkListeners(nonBulkListeners, opItems, channel);
			}
		}
	}

	private async processBulkListeners(
		listeners: ListenerEntry[],
		op: Operations,
		items: Array<{
			op: Operations;
			table: string;
			previous: any;
			current: any;
		}>,
		channel: string
	): Promise<void> {
		for (let i = 0; i < listeners.length; i += this.batchSize) {
			const chunk = listeners.slice(i, i + this.batchSize);
			const results = await Promise.allSettled(
				chunk.map(({ listener, columns }) => {
					const bulkData = items.map((item) => ({
						previous: filterRowByColumns(item.previous, columns),
						current: filterRowByColumns(item.current, columns)
					}));

					return (listener as BulkListenerCallback<any, any, any>)({
						op,
						table: items[0]!.table,
						data: bulkData
					});
				})
			);

			results.forEach((result) => {
				if (result.status === "rejected") {
					this.logger?.error(
						{ error: result.reason },
						`Bulk batch failure on channel ${channel}`
					);
				}
			});
		}
	}

	private async processNonBulkListeners(
		listeners: ListenerEntry[],
		items: Array<{
			op: Operations;
			table: string;
			previous: any;
			current: any;
		}>,
		channel: string
	): Promise<void> {
		for (let i = 0; i < listeners.length; i += this.batchSize) {
			const chunk = listeners.slice(i, i + this.batchSize);
			const results = await Promise.allSettled(
				chunk.map(({ listener, columns }) =>
					Promise.all(
						items.map((item) => {
							return (listener as ListenerCallback<any, any, any>)({
								op: item.op,
								table: item.table,
								data: {
									previous: filterRowByColumns(item.previous, columns),
									current: filterRowByColumns(item.current, columns)
								}
							});
						})
					)
				)
			);

			results.forEach((result) => {
				if (result.status === "rejected") {
					this.logger?.error(
						{ error: result.reason },
						`Non-bulk batch failure on channel ${channel}`
					);
				}
			});
		}
	}

	async flushAll(): Promise<void> {
		const channels = Array.from(this.batchQueue.keys());
		await Promise.all(channels.map((channel) => this.processBatch(channel)));
	}

	cleanup(): void {
		for (const batch of this.batchQueue.values()) {
			if (batch.timer) {
				clearTimeout(batch.timer);
			}
		}
		this.batchQueue.clear();
	}
}
