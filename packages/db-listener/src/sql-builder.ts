import { MANAGED_PREFIX } from "./constants";
import type { Operations } from "./types";
import { funcNameFor, qIdent, qLiteral, trigNameFor } from "./utils";

export function buildFunctionSQL(channel: string, columns: string[]): string {
	const fnName = funcNameFor(channel);
	const colsArray = columns.map(qLiteral).join(", ");

	return `
		CREATE OR REPLACE FUNCTION ${qIdent(fnName)}() RETURNS trigger AS $$
		DECLARE
		payload jsonb;
		data_array jsonb;
		BEGIN
		-- For statement-level triggers, we create an array of objects with previous and current
		IF TG_OP = 'DELETE' THEN
			data_array := (
				SELECT jsonb_agg(
					jsonb_build_object(
						'previous', (SELECT jsonb_object_agg(key, value)
									 FROM jsonb_each(to_jsonb(t))
									 WHERE key = ANY(ARRAY[${colsArray}]::text[])),
						'current', NULL
					)
				)
				FROM old_table t
			);
		ELSIF TG_OP = 'INSERT' THEN
			data_array := (
				SELECT jsonb_agg(
					jsonb_build_object(
						'previous', NULL,
						'current', (SELECT jsonb_object_agg(key, value)
									FROM jsonb_each(to_jsonb(t))
									WHERE key = ANY(ARRAY[${colsArray}]::text[]))
					)
				)
				FROM new_table t
			);
		ELSE -- UPDATE
			data_array := (
				SELECT jsonb_agg(
					jsonb_build_object(
						'previous', (SELECT jsonb_object_agg(key, value)
									 FROM jsonb_each(to_jsonb(old_t))
									 WHERE key = ANY(ARRAY[${colsArray}]::text[])),
						'current', (SELECT jsonb_object_agg(key, value)
									FROM jsonb_each(to_jsonb(new_t))
									WHERE key = ANY(ARRAY[${colsArray}]::text[]))
					)
				)
				FROM old_table old_t
				JOIN new_table new_t ON old_t.id = new_t.id
			);
		END IF;

		-- Only send notification if there's actual data
		IF data_array IS NOT NULL AND jsonb_array_length(data_array) > 0 THEN
			payload := jsonb_build_object(
				'op', TG_OP,
				'table', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
				'data', data_array
			);

			PERFORM pg_notify(${qLiteral(channel)}, payload::text);
		END IF;

		RETURN NULL;
		END;
		$$ LANGUAGE plpgsql;
	`;
}

export function buildTriggerSQL(
	channel: string,
	schema: string,
	table: string,
	ops: Set<Operations>
): string {
	const fnName = qIdent(funcNameFor(channel));
	const qualifiedTable = `${qIdent(schema)}.${qIdent(table)}`;

	let sql = "";

	for (const op of ops) {
		const trigName = qIdent(`${trigNameFor(channel)}_${op.toLowerCase()}`);
		const referencing =
			op === "INSERT"
				? "REFERENCING NEW TABLE AS new_table"
				: op === "DELETE"
					? "REFERENCING OLD TABLE AS old_table"
					: "REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table";

		sql += `
        DROP TRIGGER IF EXISTS ${trigName} ON ${qualifiedTable};
        CREATE TRIGGER ${trigName}
        AFTER ${op} ON ${qualifiedTable}
        ${referencing}
        FOR EACH STATEMENT
        EXECUTE FUNCTION ${fnName}();
    `;
	}

	return sql;
}

export function getListenSQL(
	current: Set<string>,
	desired: Set<string>
): string {
	const toListen = [...desired].filter((ch) => !current.has(ch));
	const toUnlisten = [...current].filter(
		(ch) => ch.startsWith(`${MANAGED_PREFIX}:`) && !desired.has(ch)
	);

	let sql = "";
	for (const ch of toUnlisten) sql += `UNLISTEN ${qIdent(ch)};\n`;
	for (const ch of toListen) sql += `LISTEN ${qIdent(ch)};\n`;
	return sql;
}
