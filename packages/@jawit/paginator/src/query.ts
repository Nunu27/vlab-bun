// query.ts

/** biome-ignore-all lint/suspicious/noExplicitAny: for loose typing */
import { ilike, or, type SQL } from "drizzle-orm";
import { type FilterOp, filterMap } from "./constants";

export const buildFilterConditions = <
	TFilters extends { field: string; op: FilterOp; value: any }[],
>(
	filters: TFilters,
	columns: Record<string, any>,
): SQL[] => {
	return filters.flatMap(({ field, op, value }) => {
		const column = columns[field];
		if (!column) return [];

		const condition = filterMap[op]?.(column, value);
		return condition ? [condition] : [];
	});
};

export const buildSearchConditions = (
	search: string,
	searchableColumns: string[],
	columns: Record<string, any>,
): SQL | undefined => {
	if (!search || searchableColumns.length === 0) return undefined;

	const searchConditions = searchableColumns.flatMap((columnName) => {
		const column = columns[columnName];
		if (!column) return [];
		return [ilike(column, `%${search}%`)];
	});

	return searchConditions.length > 0 ? or(...searchConditions) : undefined;
};
