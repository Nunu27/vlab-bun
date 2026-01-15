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
	private processing = new Set<string>(); // Track channels being processed
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

		for (const data of rowData) {
			batch.items.push({
				op,
				table,
				previous: data.previous || null,
				current: data.current || null
			});
		}

		this.scheduleBatchProcessing(channel);
	}

	private scheduleBatchProcessing(channel: string): void {
		const batch = this.batchQueue.get(channel);
		if (!batch) return;

		// Clear existing timer
		if (batch.timer) {
			clearTimeout(batch.timer);
		}

		const timeSinceFirst = Date.now() - batch.firstReceivedAt;

		// Process immediately if max wait exceeded
		if (timeSinceFirst >= this.maxBatchWaitMs) {
			this.processBatch(channel);
			return;
		}

		// Schedule processing
		const delay = Math.min(
			this.debounceMs,
			this.maxBatchWaitMs - timeSinceFirst
		);
		batch.timer = setTimeout(() => this.processBatch(channel), delay);
	}

	async processBatch(channel: string): Promise<void> {
		// Prevent concurrent processing of same channel
		if (this.processing.has(channel)) {
			return;
		}

		const batch = this.batchQueue.get(channel);
		if (!batch || batch.items.length === 0) {
			return;
		}

		// Mark as processing and extract items
		this.processing.add(channel);
		const items = [...batch.items];
		this.batchQueue.delete(channel);

		try {
			await this.processItems(channel, items);
		} finally {
			this.processing.delete(channel);
		}
	}

	private async processItems(
		channel: string,
		items: Array<{ op: Operations; table: string; previous: any; current: any }>
	): Promise<void> {
		const allListeners = this.registry.get(channel);
		const listeners = allListeners?.filter((l) => !l.paused);

		if (!listeners || listeners.length === 0) return;

		// Group items by operation
		const byOp = new Map<Operations, typeof items>();
		for (const item of items) {
			if (!byOp.has(item.op)) {
				byOp.set(item.op, []);
			}
			byOp.get(item.op)!.push(item);
		}

		// Process each operation
		for (const [op, opItems] of byOp) {
			const matchingListeners = listeners.filter((l) => l.events.has(op));

			if (matchingListeners.length === 0) continue;

			const bulk = matchingListeners.filter((l) => l.bulk);
			const nonBulk = matchingListeners.filter((l) => !l.bulk);

			// Process bulk listeners
			if (bulk.length > 0) {
				await this.callBulkListeners(bulk, op, opItems, channel);
			}

			// Process non-bulk listeners
			if (nonBulk.length > 0) {
				await this.callNonBulkListeners(nonBulk, opItems, channel);
			}
		}
	}

	private async callBulkListeners(
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

			const promises = chunk.map(({ listener, columns }) => {
				const data = items.map((item) => ({
					previous: filterRowByColumns(item.previous, columns),
					current: filterRowByColumns(item.current, columns)
				}));

				return (listener as BulkListenerCallback<any, any, any>)({
					op,
					table: items[0]!.table,
					data
				});
			});

			const results = await Promise.allSettled(promises);

			for (const result of results) {
				if (result.status === "rejected") {
					this.logger?.error(
						{ error: result.reason },
						`Bulk listener error on ${channel}`
					);
				}
			}
		}
	}

	private async callNonBulkListeners(
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

			const promises = chunk.map(({ listener, columns }) =>
				Promise.all(
					items.map((item) =>
						(listener as ListenerCallback<any, any, any>)({
							op: item.op,
							table: item.table,
							data: {
								previous: filterRowByColumns(item.previous, columns),
								current: filterRowByColumns(item.current, columns)
							}
						})
					)
				)
			);

			const results = await Promise.allSettled(promises);

			for (const result of results) {
				if (result.status === "rejected") {
					this.logger?.error(
						{ error: result.reason },
						`Non-bulk listener error on ${channel}`
					);
				}
			}
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
		this.processing.clear();
	}
}
