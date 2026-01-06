import type { PoolClient } from "pg";
import { FUNC_PREFIX, TRIGGER_PREFIX } from "./constants";
import { buildFunctionSQL, buildTriggerSQL, getListenSQL } from "./sql-builder";
import type {
	DBListenerConfig,
	DBState,
	ListenerEntry,
	Operations,
	SyncStats,
	TriggerInfo
} from "./types";
import { funcNameFor, qIdent, qLiteral, trigNameFor } from "./utils";

export class SyncManager {
	private client: PoolClient;
	private registry: Map<string, ListenerEntry[]>;
	private logger: DBListenerConfig["logger"];

	constructor(
		client: PoolClient,
		registry: Map<string, ListenerEntry[]>,
		logger?: DBListenerConfig["logger"]
	) {
		this.client = client;
		this.registry = registry;
		this.logger = logger;
	}

	async syncChannels(): Promise<void> {
		// Only include channels with at least one active (non-paused) listener
		const desiredChannels = new Set(
			Array.from(this.registry.entries())
				.filter(([, listeners]) => listeners.some((l) => !l.paused))
				.map(([channel]) => channel)
		);

		const { currentChannels } = await this.getDBState();
		const listenSQL = getListenSQL(currentChannels, desiredChannels);

		if (listenSQL) {
			await this.client.query(listenSQL);
			this.logger?.info("DB Channels Synced");
		}
	}

	async syncListeners(): Promise<void> {
		const desiredListeners = this.getDesiredListeners();
		const { existingTriggers } = await this.getDBState();
		const desiredTriggers = this.buildDesiredTriggers(desiredListeners);

		const { addSQL, dropSQL } = this.getTriggerDiffSQL(
			existingTriggers,
			desiredTriggers
		);

		const fullSQL = addSQL + dropSQL;
		if (fullSQL) {
			await this.client.query(fullSQL);
		}

		const stats: SyncStats = {
			addedTriggers: addSQL
				? (addSQL.match(/CREATE TRIGGER/g) || []).length
				: 0,
			droppedTriggers: dropSQL
				? (dropSQL.match(/DROP TRIGGER/g) || []).length
				: 0
		};

		if (stats.addedTriggers || stats.droppedTriggers) {
			this.logger?.info(
				`DB Listener Sync: +${stats.addedTriggers}/-${stats.droppedTriggers}`
			);
		}
	}

	private getDesiredListeners(): TriggerInfo[] {
		return Array.from(this.registry.entries()).map(([channel, entries]) => {
			const [, fullTable = ""] = channel.split(":");
			const [schema = "", table = ""] = fullTable.split(".");

			const allColumns = entries.reduce((acc, { columns }) => {
				columns.forEach((col) => acc.add(col));
				return acc;
			}, new Set<string>());

			const allOps = entries.reduce((acc, { events }) => {
				events.forEach((op: Operations) => acc.add(op));
				return acc;
			}, new Set<Operations>());

			return {
				channel,
				schema,
				table,
				cols: Array.from(allColumns),
				events: allOps
			};
		});
	}

	private buildDesiredTriggers(
		desiredListeners: TriggerInfo[]
	): Map<string, TriggerInfo> {
		const desiredTriggers = new Map<string, TriggerInfo>();

		for (const d of desiredListeners) {
			for (const op of d.events) {
				const trigName = `${trigNameFor(d.channel)}_${op.toLowerCase()}`;
				const key = `${d.schema}.${d.table}:${trigName}`;
				desiredTriggers.set(key, {
					channel: d.channel,
					schema: d.schema,
					table: d.table,
					cols: d.cols,
					events: new Set([op])
				});
			}
		}

		return desiredTriggers;
	}

	private getTriggerDiffSQL(
		existing: Set<string>,
		desired: Map<string, TriggerInfo>
	): { addSQL: string; dropSQL: string } {
		let addSQL = "";
		let dropSQL = "";

		const channelsInUse = new Set<string>();
		for (const d of desired.values()) {
			channelsInUse.add(d.channel);
		}

		const previousChannels = new Set<string>();
		for (const key of existing) {
			const [, tgname = ""] = key.split(":");
			const baseTrigName = tgname.replace(/_(?:insert|update|delete)$/, "");
			const channelHash = baseTrigName.substring(TRIGGER_PREFIX.length);
			previousChannels.add(channelHash);
		}

		// Drop triggers that are no longer desired
		for (const key of existing) {
			if (!desired.has(key)) {
				const [schemaTable = "", tgname = ""] = key.split(":");
				const [schema = "", table = ""] = schemaTable.split(".");
				dropSQL += `DROP TRIGGER IF EXISTS ${qIdent(tgname)} ON ${qIdent(
					schema
				)}.${qIdent(table)};\n`;
			}
		}

		// Drop functions for channels that are no longer in use at all
		for (const channelHash of previousChannels) {
			const stillInUse = Array.from(channelsInUse).some((channel) => {
				return funcNameFor(channel).includes(channelHash);
			});

			if (!stillInUse) {
				const fnName = `${FUNC_PREFIX}${channelHash}`;
				dropSQL += `DROP FUNCTION IF EXISTS ${qIdent(fnName)}();\n`;
			}
		}

		// Create functions and triggers for new channels
		const functionsCreated = new Set<string>();
		for (const [key, d] of desired) {
			if (!functionsCreated.has(d.channel)) {
				addSQL += buildFunctionSQL(d.channel, d.cols);
				functionsCreated.add(d.channel);
			}

			const existingKey = Array.from(existing).find((k) => k === key);
			if (!existingKey) {
				addSQL += buildTriggerSQL(d.channel, d.schema, d.table, d.events);
			}
		}

		if (addSQL) addSQL = `BEGIN;\n${addSQL}COMMIT;\n`;
		if (dropSQL) dropSQL = `BEGIN;\n${dropSQL}COMMIT;\n`;

		return { addSQL, dropSQL };
	}

	private async getDBState(): Promise<DBState> {
		const [channelsRes, triggersRes] = await Promise.all([
			this.client.query<{ channel: string }>(
				`SELECT pg_listening_channels() as channel`
			),
			this.client.query<{ schema: string; table: string; tgname: string }>(`
				SELECT n.nspname AS schema, c.relname AS table, t.tgname
				FROM pg_trigger t
				JOIN pg_class c ON c.oid = t.tgrelid
				JOIN pg_namespace n ON n.oid = c.relnamespace
				WHERE NOT t.tgisinternal AND t.tgname LIKE ${qLiteral(`${TRIGGER_PREFIX}%`)}
			`)
		]);

		return {
			currentChannels: new Set(channelsRes.rows.map((r) => r.channel)),
			existingTriggers: new Set(
				triggersRes.rows.map((r) => `${r.schema}.${r.table}:${r.tgname}`)
			)
		};
	}
}
