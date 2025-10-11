import {
	and,
	asc,
	between,
	BuildQueryResult,
	count,
	DBQueryConfig,
	desc,
	eq,
	ExtractTablesWithRelations,
	getTableColumns,
	gt,
	gte,
	ilike,
	like,
	lt,
	lte,
	ne,
	notBetween,
	notLike,
	SQLWrapper,
	TableRelationalConfig
} from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { RelationalQueryBuilder } from "drizzle-orm/pg-core/query-builders/query";
import { Static, t, TSchema } from "elysia";
import { createSelectSchema } from "drizzle-typebox";

enum SortOrder {
	ASC = "asc",
	DESC = "desc"
}

enum FilterOp {
	EQ = "eq",
	NE = "ne",
	GT = "gt",
	GTE = "gte",
	LT = "lt",
	LTE = "lte",
	LIKE = "like",
	ILIKE = "ilike",
	NLIKE = "nlike",
	BT = "bt",
	NB = "nb"
}

const COLUMN_FILTER_OPS: Record<string, FilterOp[]> = {
	string: [
		FilterOp.EQ,
		FilterOp.NE,
		FilterOp.LIKE,
		FilterOp.ILIKE,
		FilterOp.NLIKE
	],
	number: [
		FilterOp.EQ,
		FilterOp.NE,
		FilterOp.GT,
		FilterOp.GTE,
		FilterOp.LT,
		FilterOp.LTE,
		FilterOp.BT,
		FilterOp.NB
	],
	bigint: [
		FilterOp.EQ,
		FilterOp.NE,
		FilterOp.GT,
		FilterOp.GTE,
		FilterOp.LT,
		FilterOp.LTE,
		FilterOp.BT,
		FilterOp.NB
	],
	date: [
		FilterOp.EQ,
		FilterOp.NE,
		FilterOp.GT,
		FilterOp.GTE,
		FilterOp.LT,
		FilterOp.LTE,
		FilterOp.BT,
		FilterOp.NB
	],
	localTime: [
		FilterOp.EQ,
		FilterOp.NE,
		FilterOp.GT,
		FilterOp.GTE,
		FilterOp.LT,
		FilterOp.LTE,
		FilterOp.BT,
		FilterOp.NB
	],
	localDate: [
		FilterOp.EQ,
		FilterOp.NE,
		FilterOp.GT,
		FilterOp.GTE,
		FilterOp.LT,
		FilterOp.LTE,
		FilterOp.BT,
		FilterOp.NB
	],
	localDateTime: [
		FilterOp.EQ,
		FilterOp.NE,
		FilterOp.GT,
		FilterOp.GTE,
		FilterOp.LT,
		FilterOp.LTE,
		FilterOp.BT,
		FilterOp.NB
	],
	boolean: [FilterOp.EQ, FilterOp.NE]
};

const getColumnFilterOps = (column: PgColumn): FilterOp[] => {
	return COLUMN_FILTER_OPS[column.dataType] ?? [];
};

const buildPaginationSchema = (table: PgTable) => {
	const columns = getTableColumns(table);
	const selectSchema = createSelectSchema(table);
	const filterItems: TSchema[] = [];

	for (const column of Object.values(columns)) {
		const filterOps = getColumnFilterOps(column);
		if (filterOps.length === 0) continue;

		const columnSchema = (selectSchema as any).properties?.[
			column.name
		] as TSchema;
		if (!columnSchema) continue;

		const rangeOps = [FilterOp.BT, FilterOp.NB];
		const singleValueOps = filterOps.filter((op) => !rangeOps.includes(op));
		const hasRangeOps = filterOps.some((op) => rangeOps.includes(op));

		if (singleValueOps.length > 0) {
			filterItems.push(
				t.Object({
					field: t.Literal(column.name),
					op: t.UnionEnum(singleValueOps as [FilterOp, ...FilterOp[]]),
					value: columnSchema
				})
			);
		}

		if (hasRangeOps) {
			filterItems.push(
				t.Object({
					field: t.Literal(column.name),
					op: t.UnionEnum([FilterOp.BT, FilterOp.NB] as [FilterOp, FilterOp]),
					value: t.Array(columnSchema, { minItems: 2, maxItems: 2 })
				})
			);
		}
	}

	return t.Object({
		page: t.Integer({ min: 1, default: 1 }),
		perPage: t.Integer({ min: 1, max: 100, default: 10 }),
		search: t.Optional(t.String({ minLength: 1 })),
		sortBy: t.Optional(
			t.UnionEnum(Object.keys(columns) as [string, ...string[]])
		),
		sortOrder: t.Optional(t.Enum(SortOrder, { default: SortOrder.ASC })),
		filters: t.Optional(
			filterItems.length > 0
				? t.Array(t.Union(filterItems))
				: t.Array(t.Never())
		)
	});
};

const buildFilterConditions = (
	filters: Array<{ field: string; op: FilterOp; value: any }>,
	columns: Record<string, any>
): SQLWrapper[] => {
	const conditions: SQLWrapper[] = [];

	const filterMap: Record<FilterOp, (col: any, val: any) => SQLWrapper | null> =
		{
			[FilterOp.EQ]: (col, val) => eq(col, val),
			[FilterOp.NE]: (col, val) => ne(col, val),
			[FilterOp.GT]: (col, val) => gt(col, val),
			[FilterOp.GTE]: (col, val) => gte(col, val),
			[FilterOp.LT]: (col, val) => lt(col, val),
			[FilterOp.LTE]: (col, val) => lte(col, val),
			[FilterOp.LIKE]: (col, val) => like(col, `%${val}%`),
			[FilterOp.ILIKE]: (col, val) => ilike(col, `%${val}%`),
			[FilterOp.NLIKE]: (col, val) => notLike(col, `%${val}%`),
			[FilterOp.BT]: (col, val) =>
				Array.isArray(val) && val.length === 2
					? between(col, val[0], val[1])
					: null,
			[FilterOp.NB]: (col, val) =>
				Array.isArray(val) && val.length === 2
					? notBetween(col, val[0], val[1])
					: null
		};

	for (const { field, op, value } of filters) {
		const column = columns[field];
		if (!column) continue;

		const condition = filterMap[op]?.(column, value);
		if (condition) conditions.push(condition);
	}

	return conditions;
};

export const createPaginator = <
	TFullSchema extends Record<string, unknown>,
	TSchema extends ExtractTablesWithRelations<TFullSchema>,
	TEntity extends keyof TSchema
>(
	db: NodePgDatabase<TFullSchema>,
	entity: TEntity
) => {
	const table = (db._.fullSchema as any)[entity] as PgTable;
	const tableConfig = (db._.schema as any)[entity] as TableRelationalConfig;
	const schema = buildPaginationSchema(table);
	const { columns } = tableConfig;

	type TFields = TSchema[TEntity];
	type TBaseOptions = DBQueryConfig<"many", true, TSchema, TFields>;

	const paginate = async <
		TOptions extends Omit<
			TBaseOptions,
			"where" | "limit" | "offset" | "orderBy"
		>
	>(
		request: Static<typeof schema>,
		options?: TOptions
	) => {
		const { page, perPage, search, sortBy, sortOrder, filters } = request;
		const offset = (page - 1) * perPage;

		const conditions = filters?.length
			? buildFilterConditions(
					filters as Array<{ field: string; op: FilterOp; value: any }>,
					columns
			  )
			: [];
		const filter = conditions.length > 0 ? and(...conditions) : undefined;

		const [{ count: total }] = await db
			.select({ count: count() })
			.from(table)
			.where(filter);

		const query = (db.query as any)[entity] as RelationalQueryBuilder<
			TSchema,
			TFields
		>;

		const items = await query.findMany({
			...options,
			where: filter,
			orderBy: sortBy
				? (sortOrder === SortOrder.DESC ? desc : asc)(columns[sortBy])
				: undefined,
			limit: perPage,
			offset
		});

		return {
			items: items as BuildQueryResult<TSchema, TFields, TOptions>[],
			pageInfo: {
				page,
				perPage,
				total,
				totalPages: Math.ceil(total / perPage)
			}
		};
	};

	return { schema, paginate };
};
