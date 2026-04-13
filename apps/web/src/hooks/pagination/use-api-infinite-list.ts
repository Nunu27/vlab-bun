/** biome-ignore-all lint/suspicious/noExplicitAny: intentional loose typing for generic infinite query endpoint */

import type { PaginatedData } from "@jawit/common";
import type {
	ExtractTreatyError,
	ExtractTreatyPaginationData,
} from "@jawit/query/types";
import type {
	InfiniteData,
	UseInfiniteQueryResult,
} from "@tanstack/react-query";
import type { PaginationEndpoint, PaginationQuery } from "@web/types";

type UseApiInfiniteListOptions<
	TEndpoint extends PaginationEndpoint,
	QueryOptions extends {
		args?: PaginationQuery;
	} = NonNullable<Parameters<TEndpoint["post"]["useInfiniteQuery"]>[0]>,
> = {
	params?: Omit<NonNullable<QueryOptions["args"]>, "page">;
	query?: Omit<QueryOptions, "args" | "getArgs">;
};

export type UseApiInfiniteListReturn<TItem> = {
	items: TItem[];
	pages: PaginatedData<TItem>[];
	fetchNextPage: () => void;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	isLoading: boolean;
	isFetching: boolean;
	error: unknown;
	refetch: () => void;
};

export function useApiInfiniteList<TEndpoint extends PaginationEndpoint>(
	endpoint: TEndpoint,
	options?: UseApiInfiniteListOptions<TEndpoint>,
): UseApiInfiniteListReturn<ExtractTreatyPaginationData<TEndpoint>> {
	const result = endpoint.post.useInfiniteQuery({
		args: {
			perPage: 20,
			...options?.params,
		},
		getArgs: (page: number, args: any) => ({
			...args,
			page,
		}),
		...options?.query,
	}) as UseInfiniteQueryResult<
		InfiniteData<PaginatedData<ExtractTreatyPaginationData<TEndpoint>>>,
		ExtractTreatyError<TEndpoint["post"]>
	>;

	const pages = result.data?.pages ?? [];
	const items = pages.flatMap((p) => p.items);

	return {
		items,
		pages,
		fetchNextPage: result.fetchNextPage,
		hasNextPage: result.hasNextPage,
		isFetchingNextPage: result.isFetchingNextPage,
		isLoading: result.isLoading,
		isFetching: result.isFetching,
		error: result.error,
		refetch: result.refetch,
	};
}
