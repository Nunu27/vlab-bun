/** biome-ignore-all lint/complexity/noBannedTypes: for empty extend */

import type {
	Static,
	TInteger,
	TObject,
	TOptional,
	TString,
	TUnsafe,
} from "@sinclair/typebox";
import type { PgTable } from "drizzle-orm/pg-core";
import type {
	COLUMN_FILTER_OPS,
	FilterOp,
	RangeOp,
	SortOrder,
} from "./constants";

export type ColumnKeys<T extends PgTable> = Extract<
	keyof T["_"]["columns"],
	string
>;

export type HasItems<T extends readonly unknown[]> = T extends readonly []
	? false
	: true;

export type GetColumnDataType<
	TTable extends PgTable,
	K extends ColumnKeys<TTable>,
> = TTable["_"]["columns"][K]["_"]["dataType"];

export type ColumnData<
	TTable extends PgTable,
	K extends ColumnKeys<TTable>,
> = TTable["_"]["columns"][K]["_"]["data"];

export type SearchableColumnKeys<TTable extends PgTable> = {
	[K in ColumnKeys<TTable>]: GetColumnDataType<TTable, K> extends "string"
		? K
		: never;
}[ColumnKeys<TTable>];

export type SupportedDataType = keyof typeof COLUMN_FILTER_OPS;

export type FilterType<
	TTable extends PgTable,
	TColumns extends ColumnKeys<TTable> = ColumnKeys<TTable>,
> = {
	[K in TColumns]: GetColumnDataType<TTable, K> extends SupportedDataType
		? (typeof COLUMN_FILTER_OPS)[GetColumnDataType<
				TTable,
				K
			>] extends readonly (infer Op extends FilterOp)[]
			? Op extends RangeOp
				? TObject<{
						field: TUnsafe<K>;
						op: TUnsafe<Op>;
						value: TUnsafe<[ColumnData<TTable, K>, ColumnData<TTable, K>]>;
					}>
				: TObject<{
						field: TUnsafe<K>;
						op: TUnsafe<Op>;
						value: TUnsafe<ColumnData<TTable, K>>;
					}>
			: never
		: never;
}[TColumns];

export type PaginationSchema<
	TTable extends PgTable,
	TColumns extends ColumnKeys<TTable> = ColumnKeys<TTable>,
	TSearchable extends boolean = true,
> = TObject<
	{
		page: TInteger;
		perPage: TInteger;
		sortBy: TOptional<TUnsafe<TColumns>>;
		sortOrder: TOptional<TUnsafe<SortOrder>>;
		filters: TOptional<TUnsafe<Static<FilterType<TTable, TColumns>>[]>>;
	} & (TSearchable extends true ? { search: TOptional<TString> } : {})
>;

export type PaginationRequest<
	TTable extends PgTable,
	TColumns extends ColumnKeys<TTable> = ColumnKeys<TTable>,
	TSearchable extends boolean = true,
> = {
	page: number;
	perPage: number;
	sortBy?: TColumns;
	sortOrder?: SortOrder;
	filters?: Static<FilterType<TTable, TColumns>>[];
} & (TSearchable extends true ? { search?: string } : {});
