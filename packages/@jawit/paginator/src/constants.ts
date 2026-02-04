/** biome-ignore-all lint/suspicious/noExplicitAny: for loose typing */
import type { AnyColumn } from "drizzle-orm";
import {
	between,
	eq,
	gt,
	gte,
	ilike,
	like,
	lt,
	lte,
	ne,
	notBetween,
	notLike,
	type SQL,
} from "drizzle-orm";

export const sortOrder = ["asc", "desc"] as const;
export type SortOrder = (typeof sortOrder)[number];

export const filterOp = [
	"eq",
	"ne",
	"gt",
	"gte",
	"lt",
	"lte",
	"like",
	"ilike",
	"nlike",
	"bt",
	"nb",
] as const;
export type FilterOp = (typeof filterOp)[number];

export const RANGE_OPS = ["bt", "nb"] as const;
export type RangeOp = (typeof RANGE_OPS)[number];

export const COLUMN_FILTER_OPS = {
	string: ["eq", "ne", "like", "ilike", "nlike"],
	number: ["eq", "ne", "gt", "gte", "lt", "lte", "bt", "nb"],
	bigint: ["eq", "ne", "gt", "gte", "lt", "lte", "bt", "nb"],
	date: ["eq", "ne", "gt", "gte", "lt", "lte", "bt", "nb"],
	localTime: ["eq", "ne", "gt", "gte", "lt", "lte", "bt", "nb"],
	localDate: ["eq", "ne", "gt", "gte", "lt", "lte", "bt", "nb"],
	localDateTime: ["eq", "ne", "gt", "gte", "lt", "lte", "bt", "nb"],
	boolean: ["eq", "ne"],
} as const;

export const filterMap = {
	eq: (col, val) => eq(col, val),
	ne: (col, val) => ne(col, val),
	gt: (col, val) => gt(col, val),
	gte: (col, val) => gte(col, val),
	lt: (col, val) => lt(col, val),
	lte: (col, val) => lte(col, val),
	like: (col, val) => like(col, `%${val}%`),
	ilike: (col, val) => ilike(col, `%${val}%`),
	nlike: (col, val) => notLike(col, `%${val}%`),
	bt: (col, val) =>
		Array.isArray(val) && val.length === 2
			? between(col, val[0], val[1])
			: null,
	nb: (col, val) =>
		Array.isArray(val) && val.length === 2
			? notBetween(col, val[0], val[1])
			: null,
} satisfies Record<FilterOp, (col: AnyColumn, val: any) => SQL | null>;
