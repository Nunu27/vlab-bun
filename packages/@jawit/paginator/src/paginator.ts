// paginator.ts

import type { PaginatedData } from "@jawit/common";
import {
	and,
	asc,
	type BuildQueryResult,
	type DBQueryConfig,
	desc,
	type ExtractTablesWithRelations,
	getTableColumns,
	isSQLWrapper,
	isTable,
	type SQL,
	type SQLWrapper,
} from "drizzle-orm";
import type { PgDatabase, PgTable } from "drizzle-orm/pg-core";
import type { RelationalQueryBuilder } from "drizzle-orm/pg-core/query-builders/query";
import { buildFilterConditions, buildSearchConditions } from "./query";
import { createPaginationSchema } from "./schema";
import type {
	HasItems,
	PaginationRequest,
	SearchableColumnKeys,
} from "./types";

export const createPaginator = <
	TFullSchema extends Record<string, unknown>,
	TRelationalSchema extends ExtractTablesWithRelations<TFullSchema>,
	TEntity extends keyof ExtractTablesWithRelations<TFullSchema>,
	TUsableColumns extends Array<
		keyof TRelationalSchema[TEntity]["columns"]
	> = [],
>(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle requires any for generic database instances
	db: PgDatabase<any, TFullSchema, any>,
	entity: TEntity,
	config?: {
		usableColumns?: TUsableColumns;
		searchableColumns?: TFullSchema[TEntity] extends PgTable
			? SearchableColumnKeys<TFullSchema[TEntity]>[]
			: never;
	},
) => {
	const table = db._.fullSchema[entity];
	if (!isTable(table)) {
		throw new Error(`Entity ${String(entity)} is not a table.`);
	}

	const columns = getTableColumns(table);

	type TTable = typeof table;
	type TColumns = Extract<TUsableColumns[number], string>;

	const usableColumnNames = config?.usableColumns as TColumns[] | undefined;
	const searchableColumnNames = config?.searchableColumns || [];

	const schema = createPaginationSchema<
		TTable,
		TColumns,
		HasItems<Readonly<TUsableColumns>>
	>(table, usableColumnNames, config?.searchableColumns || []);

	type TTableConfig = TRelationalSchema[TEntity];
	type TBaseOptions = DBQueryConfig<
		"many",
		true,
		TRelationalSchema,
		TTableConfig
	>;

	const paginate = async <
		TOptions extends Omit<TBaseOptions, "limit" | "offset" | "orderBy">,
		Item = BuildQueryResult<TRelationalSchema, TTableConfig, TOptions> & {
			index: number;
		},
	>(
		request: PaginationRequest<
			TTable,
			TColumns,
			HasItems<Readonly<TUsableColumns>>
		>,
		options?: TOptions,
	): Promise<PaginatedData<Item>> => {
		const { page, perPage, sortBy, sortOrder, filters } = request;
		const search = "search" in request ? request.search : undefined;
		const offset = (page - 1) * perPage;

		const filterConditions = filters?.length
			? buildFilterConditions(filters, columns)
			: [];
		const filter =
			filterConditions.length > 0 ? and(...filterConditions) : undefined;

		const searchCondition = search
			? buildSearchConditions(search, searchableColumnNames, columns)
			: undefined;

		let combinedConditions: SQL | undefined;
		if (filter && searchCondition) {
			combinedConditions = and(filter, searchCondition);
		} else if (filter) {
			combinedConditions = filter;
		} else if (searchCondition) {
			combinedConditions = searchCondition;
		}

		let where: TOptions["where"];

		const currentConditions = combinedConditions;
		if (currentConditions && options?.where) {
			if (isSQLWrapper(options.where)) {
				where = and(currentConditions, options.where);
			} else {
				const whereFunc = options.where as Exclude<
					TOptions["where"],
					SQLWrapper | undefined
				>;
				where = (fields, ops) => {
					const baseWhere = whereFunc(fields, ops);
					return currentConditions
						? and(currentConditions, baseWhere)
						: baseWhere;
				};
			}
		} else {
			where = currentConditions ?? options?.where;
		}

		let orderByClause: SQL | undefined;
		if (sortBy) {
			const sortColumn = columns[sortBy as string];
			if (sortColumn) {
				orderByClause = (sortOrder === "desc" ? desc : asc)(sortColumn);
			}
		}

		const total = await db.$count(table, currentConditions);
		const query = db.query[
			entity as keyof typeof db.query
		] as RelationalQueryBuilder<TRelationalSchema, TTableConfig>;

		const items = await query.findMany({
			...options,
			where,
			orderBy: orderByClause,
			limit: perPage,
			offset,
		});

		return {
			items: items.map((item, idx) => ({
				...item,
				index: offset + idx + 1,
			})) as Item[],
			pageInfo: {
				page,
				perPage,
				total,
				totalPages: Math.ceil(total / perPage),
			},
		};
	};

	return {
		schema,
		paginate,
	};
};
