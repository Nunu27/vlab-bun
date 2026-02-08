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
	} = NonNullable<Parameters<TEndpoint["post"]["usePagination"]>[0]>,
> = {
	/** Fixed query params (perPage, search, etc.) merged with the page number */
	params?: Omit<NonNullable<QueryOptions["args"]>, "page">;
	/** Extra TanStack Query options forwarded to `useInfiniteQuery` */
	query?: Omit<
		NonNullable<Parameters<TEndpoint["post"]["useInfiniteQuery"]>[0]>,
		"args" | "getArgs"
	>;
};

/** The full query-params object type for a pagination endpoint (includes page, search, etc.) */
export type ExtractEndpointQuery<TEndpoint extends PaginationEndpoint> =
	NonNullable<
		NonNullable<Parameters<TEndpoint["post"]["usePagination"]>[0]>["args"]
	>;

/** The individual item type returned by a pagination endpoint */
export type InfiniteEndpointItem<TEndpoint extends PaginationEndpoint> =
	ExtractTreatyPaginationData<TEndpoint>;

export type UseApiInfiniteListReturn<TItem> = {
	/** All items flattened from all loaded pages */
	items: TItem[];
	/** Raw pages for when you need access to pageInfo per page */
	pages: PaginatedData<TItem>[];
	fetchNextPage: () => void;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	isLoading: boolean;
	isFetching: boolean;
	error: unknown;
};

/**
 * Connects a pagination-capable Eden Treaty endpoint to TanStack's `useInfiniteQuery`.
 * Items from all loaded pages are flattened into a single `items` array.
 *
 * The `useInfiniteQuery` inside `@jawit/query` automatically handles:
 * - `initialPageParam: 1`
 * - `getNextPageParam` from `pageInfo.page` / `pageInfo.totalPages`
 *
 * @example
 * ```tsx
 * const list = useApiInfiniteList(api.department.pagination, {
 *   params: { perPage: 20 },
 * });
 * return (
 *   <InfiniteList
 *     {...list}
 *     renderItem={(item) => <DeptCard item={item} />}
 *   />
 * );
 * ```
 */
export function useApiInfiniteList<TEndpoint extends PaginationEndpoint>(
	endpoint: TEndpoint,
	options?: UseApiInfiniteListOptions<TEndpoint>,
): UseApiInfiniteListReturn<ExtractTreatyPaginationData<TEndpoint>> {
	const result = endpoint.post.useInfiniteQuery({
		args: {
			perPage: 20,
			...options?.params,
		},
		getArgs: (page, args) => ({
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
	};
}
