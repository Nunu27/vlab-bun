/** biome-ignore-all lint/complexity/noBannedTypes: for empty extend */
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
				? {
						field: K;
						op: Op;
						value: [ColumnData<TTable, K>, ColumnData<TTable, K>];
					}
				: { field: K; op: Op; value: ColumnData<TTable, K> }
			: never
		: never;
}[TColumns];

export type PaginationSchemaType<
	TTable extends PgTable,
	TColumns extends ColumnKeys<TTable> = ColumnKeys<TTable>,
	TSearchable extends boolean = boolean,
> = {
	page: number;
	perPage: number;
	sortBy?: TColumns;
	sortOrder?: SortOrder;
	filters?: FilterType<TTable, TColumns>[];
} & (TSearchable extends true ? { search?: string } : {});
