import { type TSchema, Type as t } from "@sinclair/typebox";
import { getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-typebox";
import {
	COLUMN_FILTER_OPS,
	type FilterOp,
	RANGE_OPS,
	type RangeOp,
	sortOrder,
} from "./constants";
import type { ColumnKeys, PaginationSchemaType } from "./types";

const getDataTypeFilterOps = <T extends string>(dataType: T) => {
	if (dataType in COLUMN_FILTER_OPS) {
		return COLUMN_FILTER_OPS[dataType as keyof typeof COLUMN_FILTER_OPS];
	}
	return [];
};

const StringNumber = (options?: {
	default?: number;
	minimum?: number;
	maximum?: number;
}) =>
	t
		.Transform(t.Union([t.String(), t.Number()], { default: options?.default }))
		.Decode((value) => {
			const num = Number(value);
			if (Number.isNaN(num)) throw new Error("Invalid number");
			if (!Number.isInteger(num)) throw new Error("Value must be an integer");

			if (options?.minimum !== undefined && num < options.minimum) {
				throw new Error(
					`Value must be greater than or equal to ${options.minimum}`,
				);
			}
			if (options?.maximum !== undefined && num > options.maximum) {
				throw new Error(
					`Value must be less than or equal to ${options.maximum}`,
				);
			}
			return num;
		})
		.Encode((value) => value);

export const buildPaginationSchema = <TTable extends PgTable>(
	table: TTable,
	usableColumns?: string[],
	searchableColumns?: string[],
) => {
	const columns = getTableColumns(table);
	const selectSchema = createSelectSchema(table);
	const allColumnNames = Object.keys(
		selectSchema.properties,
	) as ColumnKeys<TTable>[];

	const columnNames: string[] = usableColumns
		? allColumnNames.filter((name) => usableColumns.includes(name))
		: allColumnNames;

	const filterItems = columnNames.flatMap((columnName) => {
		const column = columns[columnName];
		if (!column) return [];

		const filterOps = getDataTypeFilterOps(column.dataType);
		if (!filterOps.length) return [];

		const columnSchema =
			selectSchema.properties[
				columnName as keyof typeof selectSchema.properties
			];
		const generatedSchemas: TSchema[] = [];

		const singleValueOps = filterOps.filter(
			(op): op is Exclude<FilterOp, RangeOp> =>
				!RANGE_OPS.includes(op as RangeOp),
		);
		const hasRangeOps = filterOps.some((op) =>
			RANGE_OPS.includes(op as RangeOp),
		);

		if (singleValueOps.length > 0) {
			generatedSchemas.push(
				t.Object(
					{
						field: t.Literal(columnName),
						op: t.Enum(
							Object.fromEntries(singleValueOps.map((op) => [op, op])),
						),
						value: columnSchema,
					},
					{ title: `${columnName} filter` },
				),
			);
		}

		if (hasRangeOps) {
			generatedSchemas.push(
				t.Object(
					{
						field: t.Literal(columnName),
						op: t.Enum(Object.fromEntries(RANGE_OPS.map((op) => [op, op]))),
						value: t.Tuple([columnSchema, columnSchema]),
					},
					{ title: `${columnName} range filter` },
				),
			);
		}
		return generatedSchemas;
	});

	const filterItem = filterItems[0];
	const baseFilterSchema =
		filterItems.length === 0
			? t.Never()
			: filterItems.length === 1 && filterItem
				? filterItem
				: t.Union(filterItems);

	const filterSchema = t.Array(baseFilterSchema);

	const baseSchema = {
		page: StringNumber({ default: 1, minimum: 1 }),
		perPage: StringNumber({ default: 10, minimum: 1, maximum: 100 }),
		sortBy: t.Optional(
			t.Enum(Object.fromEntries(columnNames.map((col) => [col, col]))),
		),
		sortOrder: t.Optional(
			t.Enum(Object.fromEntries(sortOrder.map((order) => [order, order]))),
		),
		filters: t.Optional(filterSchema),
	};

	if (searchableColumns?.length) {
		return t.Object({
			...baseSchema,
			search: t.Optional(t.String({ minLength: 1 })),
		});
	}

	return t.Object(baseSchema);
};

export const createPaginationSchema = <
	TTable extends PgTable,
	TColumns extends ColumnKeys<TTable> = ColumnKeys<TTable>,
	TSearchable extends boolean = boolean,
>(
	table: TTable,
	usableColumns?: TColumns[],
	searchableColumns?: string[],
) => {
	return buildPaginationSchema(
		table,
		usableColumns as string[],
		searchableColumns,
	) as TSchema & {
		static: PaginationSchemaType<TTable, TColumns, TSearchable>;
	};
};
