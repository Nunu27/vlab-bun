import env from "@/env";
import logger from "@/services/logger";
import { md5 } from "@/utils/crypto";
import { ExtractTablesWithRelations, InferSelectModel } from "drizzle-orm";
import { toSnakeCase } from "drizzle-orm/casing";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import db from ".";

const client = await db.$client.connect();
type DB = typeof db;
type TFullSchema = DB["_"]["fullSchema"];
type TSchema = ExtractTablesWithRelations<TFullSchema>;

const MANAGED_PREFIX = "on_change";
const TRIGGER_PREFIX = "trg_onchg_";
const FUNC_PREFIX = "fn_onchg_";
const BATCH_SIZE = Math.max(1, Number(env.BATCH_SIZE ?? 64));

type Operations = "INSERT" | "UPDATE" | "DELETE";
type ListenerCallback<
	T extends PgTable,
	K extends keyof InferSelectModel<T> = keyof InferSelectModel<T>
> = (event: {
	op: Operations;
	table: string;
	data: { [P in K]: InferSelectModel<T>[P] };
}) => Promise<void>;
type ListenerEntry = {
	events: Set<Operations>;
	listener: ListenerCallback<any, any>;
};

// In-memory registry, keyed by channel: "on_change:schema.table:col1,col2"
const registry = new Map<string, ListenerEntry[]>();

const trigNameFor = (channel: string) => `${TRIGGER_PREFIX}${md5(channel)}`;
const funcNameFor = (channel: string) => `${FUNC_PREFIX}${md5(channel)}`;

const qIdent = (s: string) => `"${s.replace(/"/g, '""')}"`;
const qLiteral = (s: string) => `'${s.replace(/'/g, "''")}'`;
const areSetsEqual = (a: Set<unknown>, b: Set<unknown>) =>
	a.size === b.size && [...a].every((x) => b.has(x));

const getChannelForTable = <T extends PgTable>(
	table: T,
	columns: (keyof InferSelectModel<T>)[]
): string => {
	const { schema = "public", name, columns: cols } = getTableConfig(table);
	const sqlCols = cols.reduce<string[]>((acc, col) => {
		if (columns.includes(col.name)) {
			acc.push(toSnakeCase(col.name));
		}

		return acc;
	}, []);

	return `${MANAGED_PREFIX}:${schema}.${name}:${sqlCols.join(",")}`;
};

client.on("notification", async ({ channel, payload }) => {
	if (!payload || !registry.has(channel)) return;

	let parsedPayload: { op: Operations; table: string; data: any };
	try {
		parsedPayload = JSON.parse(payload);
	} catch (e) {
		logger.error(e, `DB Listener: Invalid JSON payload on ${channel}`);
		return;
	}

	const listeners = registry.get(channel)!;
	const listenersToCall = listeners.filter(({ events }) =>
		events.has(parsedPayload.op)
	);

	if (listenersToCall.length === 0) return;

	for (let i = 0; i < listenersToCall.length; i += BATCH_SIZE) {
		const chunk = listenersToCall.slice(i, i + BATCH_SIZE);
		const results = await Promise.allSettled(
			chunk.map(({ listener }) => listener(parsedPayload))
		);

		results.forEach((result) => {
			if (result.status === "rejected") {
				logger.error(
					result.reason,
					`DB Listener: Failure on channel ${channel}`
				);
			}
		});
	}
});

export const addDBListener = <
	TEntity extends keyof TSchema,
	TTable extends TFullSchema[TEntity],
	K extends keyof InferSelectModel<TTable>
>(
	entity: TEntity,
	columns: K[],
	listener: ListenerCallback<TTable, K>,
	opts?: { ops?: Array<Operations> }
) => {
	const table = db._.fullSchema[entity];
	const channel = getChannelForTable(table, columns);
	const listeners = registry.get(channel) ?? [];

	listeners.push({
		events: new Set(opts?.ops ?? ["INSERT", "UPDATE", "DELETE"]),
		listener
	});

	registry.set(channel, listeners);
};

export const removeDBListener = <
	T extends PgTable,
	K extends keyof InferSelectModel<T>
>(
	table: T,
	columns: K[],
	listener: ListenerCallback<T, K>,
	opts?: { ops?: Array<Operations> }
) => {
	const channel = getChannelForTable(table, columns);
	const listeners = registry.get(channel);
	if (!listeners) return;

	const opsSet = new Set(opts?.ops ?? ["INSERT", "UPDATE", "DELETE"]);
	const listenerIndex = listeners.findIndex(
		(entry) => entry.listener === listener && areSetsEqual(entry.events, opsSet)
	);

	if (listenerIndex !== -1) {
		listeners.splice(listenerIndex, 1);
	}

	if (listeners.length === 0) {
		registry.delete(channel);
	}
};

function buildFunctionSQL(channel: string, columns: string[]): string {
	const fnName = funcNameFor(channel);
	const colsArray = columns.map(qLiteral).join(", ");

	return `
		CREATE OR REPLACE FUNCTION ${qIdent(fnName)}() RETURNS trigger AS $$
		DECLARE
		row_data jsonb;
		payload jsonb;
		data_obj jsonb;
		BEGIN
		-- On DELETE, NEW is null, so we must use OLD.
		row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

		-- Build a JSON object containing only the listened-to columns.
		data_obj := (
			SELECT jsonb_object_agg(key, value)
			FROM jsonb_each(row_data)
			WHERE key = ANY(ARRAY[${colsArray}]::text[])
		);

		payload := jsonb_build_object(
			'op', TG_OP,
			'table', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
			'data', COALESCE(data_obj, '{}'::jsonb)
		);

		PERFORM pg_notify(${qLiteral(channel)}, payload::text);

		RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
		END;
		$$ LANGUAGE plpgsql;
	`;
}

function buildTriggerSQL(
	channel: string,
	schema: string,
	table: string,
	ops: Set<Operations>
): string {
	const trigName = qIdent(trigNameFor(channel));
	const fnName = qIdent(funcNameFor(channel));
	const qualifiedTable = `${qIdent(schema)}.${qIdent(table)}`;
	const events = [...ops].join(" OR ");

	return `
        DROP TRIGGER IF EXISTS ${trigName} ON ${qualifiedTable};
        CREATE TRIGGER ${trigName}
        AFTER ${events} ON ${qualifiedTable}
        FOR EACH ROW
        EXECUTE FUNCTION ${fnName}();
    `;
}

/**
 * Reconciles the in-memory listener registry with the actual database state.
 */
export const syncDBListeners = async () => {
	const desiredListeners = Array.from(registry.entries()).map(
		([channel, entries]) => {
			const [, fullTable, cols] = channel.split(":");
			const [schema, table] = fullTable.split(".");
			const allOps = entries.reduce((acc, { events }) => {
				events.forEach((op: Operations) => acc.add(op));
				return acc;
			}, new Set<Operations>());

			return { channel, schema, table, cols: cols.split(","), events: allOps };
		}
	);

	const { currentChannels, existingTriggers } = await _getDBState();

	const desiredChannels = new Set(desiredListeners.map((d) => d.channel));
	const listenSQL = _getListenSQL(currentChannels, desiredChannels);

	const desiredTriggers = new Map(
		desiredListeners.map((d) => {
			const key = `${d.schema}.${d.table}:${trigNameFor(d.channel)}`;
			return [key, d];
		})
	);
	const { addSQL, dropSQL } = _getTriggerDiffSQL(
		existingTriggers,
		desiredTriggers
	);

	const fullSQL = listenSQL + addSQL + dropSQL;
	if (fullSQL) {
		await client.query(fullSQL);
	}

	const stats = {
		addedTriggers: addSQL ? (addSQL.match(/CREATE TRIGGER/g) || []).length : 0,
		droppedTriggers: dropSQL ? (dropSQL.match(/DROP TRIGGER/g) || []).length : 0
	};

	if (stats.addedTriggers || stats.droppedTriggers) {
		logger.info(
			`DB Listener Sync: +${stats.addedTriggers}/-${stats.droppedTriggers}`
		);
	}
};

async function _getDBState() {
	const [channelsRes, triggersRes] = await Promise.all([
		client.query<{ channel: string }>(
			`SELECT pg_listening_channels() as channel`
		),
		client.query<{ schema: string; table: string; tgname: string }>(`
            SELECT n.nspname AS schema, c.relname AS table, t.tgname
            FROM pg_trigger t
            JOIN pg_class c ON c.oid = t.tgrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE NOT t.tgisinternal AND t.tgname LIKE ${qLiteral(
							`${TRIGGER_PREFIX}%`
						)}
        `)
	]);

	return {
		currentChannels: new Set(channelsRes.rows.map((r) => r.channel)),
		existingTriggers: new Set(
			triggersRes.rows.map((r) => `${r.schema}.${r.table}:${r.tgname}`)
		)
	};
}

function _getListenSQL(current: Set<string>, desired: Set<string>): string {
	const toListen = [...desired].filter((ch) => !current.has(ch));
	const toUnlisten = [...current].filter(
		(ch) => ch.startsWith(`${MANAGED_PREFIX}:`) && !desired.has(ch)
	);

	let sql = "";
	for (const ch of toUnlisten) sql += `UNLISTEN ${qIdent(ch)};\n`;
	for (const ch of toListen) sql += `LISTEN ${qIdent(ch)};\n`;
	return sql;
}

function _getTriggerDiffSQL(
	existing: Set<string>,
	desired: Map<
		string,
		{
			channel: string;
			schema: string;
			table: string;
			cols: string[];
			events: Set<Operations>;
		}
	>
) {
	let addSQL = "";
	let dropSQL = "";

	for (const key of existing) {
		if (!desired.has(key)) {
			const [schemaTable, tgname] = key.split(":");
			const [schema, table] = schemaTable.split(".");
			const fnName = `${FUNC_PREFIX}${tgname.substring(TRIGGER_PREFIX.length)}`;

			dropSQL += `DROP TRIGGER IF EXISTS ${qIdent(tgname)} ON ${qIdent(
				schema
			)}.${qIdent(table)};\n`;
			dropSQL += `DROP FUNCTION IF EXISTS ${qIdent(fnName)}();\n`;
		}
	}

	for (const [key, d] of desired) {
		if (!existing.has(key)) {
			addSQL += buildFunctionSQL(d.channel, d.cols);
			addSQL += buildTriggerSQL(d.channel, d.schema, d.table, d.events);
		}
	}

	if (addSQL) addSQL = `BEGIN;\n${addSQL}COMMIT;\n`;
	if (dropSQL) dropSQL = `BEGIN;\n${dropSQL}COMMIT;\n`;

	return { addSQL, dropSQL };
}
