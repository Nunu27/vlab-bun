/** biome-ignore-all lint/suspicious/noExplicitAny: intentional loose typing for generic query endpoint */

import type { PaginatedData } from "@jawit/common";
import type {
	ExtractTreatyError,
	ExtractTreatyPaginationData,
	ExtractTreatyParams,
} from "@jawit/query/types";
import type { UseQueryResult } from "@tanstack/react-query";
import type { PaginationEndpoint, PaginationQuery } from "@web/types";
import type { UsePaginationParamsReturn } from "./use-pagination-params";
import { usePaginationParams } from "./use-pagination-params";

type UseApiPaginationOptions<
	TEndpoint extends PaginationEndpoint,
	QueryOptions extends {
		args?: PaginationQuery;
	} = NonNullable<Parameters<TEndpoint["post"]["usePagination"]>[0]>,
> = {
	urlKey?: string;
	params?: Omit<QueryOptions["args"], "page" | "filters">;
	query?: Omit<QueryOptions, "args">;
};

export type UseApiPaginationReturn<
	TItem,
	TQuery extends PaginationQuery = PaginationQuery,
> = Omit<UsePaginationParamsReturn, "filters" | "setFilters"> & {
	data: PaginatedData<TItem> | undefined;
	isLoading: boolean;
	isFetching: boolean;
	error: unknown;
	refresh: () => void;
	filters: NonNullable<TQuery["filters"]> | undefined;
	setFilters: (filters: NonNullable<PaginationQuery["filters"]> | null) => void;
};

export function useApiPagination<TEndpoint extends PaginationEndpoint>(
	endpoint: TEndpoint,
	options?: UseApiPaginationOptions<TEndpoint>,
): UseApiPaginationReturn<
	ExtractTreatyPaginationData<TEndpoint>,
	ExtractTreatyParams<TEndpoint["post"]>
> {
	const paginationState = usePaginationParams({ urlKey: options?.urlKey });

	const result = endpoint.post.usePagination({
		...options?.query,
		args: {
			...options?.params,
			...paginationState.params,
			filters: [
				...(options?.params?.filters ?? []),
				...(paginationState.filters ?? []),
			],
		},
	}) as UseQueryResult<
		PaginatedData<ExtractTreatyPaginationData<TEndpoint>>,
		ExtractTreatyError<TEndpoint["post"]>
	>;

	const refresh = () => {
		result.refetch();
	};

	return {
		...paginationState,
		data: result.data ?? undefined,
		isLoading: result.isLoading,
		isFetching: result.isFetching,
		error: result.error,
		refresh,
	};
}
