import type { BlobOrStringOrBuffer } from "bun";
import type { InferSelectModel } from "drizzle-orm";
import { toSnakeCase } from "drizzle-orm/casing";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import { FUNC_PREFIX, TRIGGER_PREFIX } from "./constants";

const md5 = (input: BlobOrStringOrBuffer) =>
	new Bun.CryptoHasher("md5").update(input).digest("hex");

export const trigNameFor = (channel: string) =>
	`${TRIGGER_PREFIX}${md5(channel)}`;
export const funcNameFor = (channel: string) => `${FUNC_PREFIX}${md5(channel)}`;

export const qIdent = (s: string) => `"${s.replace(/"/g, '""')}"`;
export const qLiteral = (s: string) => `'${s.replace(/'/g, "''")}'`;

export const areSetsEqual = (a: Set<unknown>, b: Set<unknown>) =>
	a.size === b.size && [...a].every((x) => b.has(x));

export const getChannelForTable = <T extends PgTable>(table: T): string => {
	const { schema = "public", name } = getTableConfig(table);
	return `on_change:${schema}.${name}`;
};

export const normalizeColumns = <T extends PgTable>(
	table: T,
	columns: (keyof InferSelectModel<T>)[]
): string[] => {
	const { columns: cols } = getTableConfig(table);
	return cols.reduce<string[]>((acc, col) => {
		if (columns.includes(col.name)) {
			acc.push(toSnakeCase(col.name));
		}
		return acc;
	}, []);
};

export const filterRowByColumns = (row: any, columns: Set<string>): any => {
	if (!row) return null;
	return Object.keys(row).reduce((acc, key) => {
		if (columns.has(key)) {
			acc[key] = row[key];
		}
		return acc;
	}, {} as any);
};
