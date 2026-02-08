import type { PaginationQuery, SortOrder } from "@web/types";
import {
	createParser,
	parseAsInteger,
	parseAsString,
	useQueryState,
	useQueryStates,
} from "nuqs";
import { useCallback, useMemo } from "react";

type PaginationParamOptions = {
	/** URL key prefix to namespace params. Default: empty (bare param names). */
	urlKey?: string;
};

type PaginationFilters = NonNullable<PaginationQuery["filters"]>;

function withPrefix(prefix: string | undefined, name: string) {
	return prefix ? `${prefix}_${name}` : name;
}

// filters is JSON-encoded as a single URL param
const parseAsFilters = createParser<PaginationFilters | null>({
	parse: (v) => {
		try {
			const parsed = JSON.parse(v);
			return Array.isArray(parsed) ? parsed : null;
		} catch {
			return null;
		}
	},
	serialize: (v) => JSON.stringify(v),
});

export function usePaginationParams(options?: PaginationParamOptions) {
	const prefix = options?.urlKey;

	const [{ page, perPage }, setPagination] = useQueryStates(
		{
			page: parseAsInteger.withDefault(1),
			perPage: parseAsInteger.withDefault(10),
		},
		{
			urlKeys: {
				page: withPrefix(prefix, "page"),
				perPage: withPrefix(prefix, "perPage"),
			},
		},
	);

	const [search, setSearch] = useQueryState(
		withPrefix(prefix, "search"),
		parseAsString.withDefault(""),
	);

	const [sortBy, setSortBy] = useQueryState(
		withPrefix(prefix, "sortBy"),
		parseAsString,
	);

	const [sortOrder, setSortOrder] = useQueryState(
		withPrefix(prefix, "sortOrder"),
		parseAsString.withDefault("asc"),
	);

	const [filters, setFilters] = useQueryState(
		withPrefix(prefix, "filters"),
		parseAsFilters,
	);

	const setPage = useCallback(
		(p: number) => setPagination({ page: p }),
		[setPagination],
	);

	const setPerPage = useCallback(
		(pp: number) => setPagination({ perPage: pp, page: 1 }),
		[setPagination],
	);

	const setSearchAndResetPage = useCallback(
		(s: string) => {
			setSearch(s || null);
			setPagination({ page: 1 });
		},
		[setSearch, setPagination],
	);

	const setSortAndResetPage = useCallback(
		(by: string | undefined, order: SortOrder) => {
			setSortBy(by ?? null);
			setSortOrder(order);
			setPagination({ page: 1 });
		},
		[setSortBy, setSortOrder, setPagination],
	);

	const setFiltersAndResetPage = useCallback(
		(f: PaginationFilters | null) => {
			setFilters(f);
			setPagination({ page: 1 });
		},
		[setFilters, setPagination],
	);

	const params = useMemo(
		() => ({
			page,
			perPage,
			...(search ? { search } : {}),
			...(sortBy ? { sortBy } : {}),
			sortOrder: sortOrder as SortOrder,
			...(filters?.length ? { filters } : {}),
		}),
		[page, perPage, search, sortBy, sortOrder, filters],
	);

	return {
		params,
		page,
		perPage,
		search,
		sortBy: sortBy ?? undefined,
		sortOrder: (sortOrder ?? "asc") as SortOrder,
		filters: filters ?? undefined,
		setPage,
		setPerPage,
		setSearch: setSearchAndResetPage,
		setSort: setSortAndResetPage,
		setFilters: setFiltersAndResetPage,
	};
}

export type UsePaginationParamsReturn = ReturnType<typeof usePaginationParams>;
