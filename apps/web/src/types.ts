/** biome-ignore-all lint/suspicious/noExplicitAny: intentional loose typing for generic api function */

import type { PaginatedData } from "@jawit/common";
import type { PaginationSchema } from "@jawit/paginator";
import type {
	InfiniteData,
	UseInfiniteQueryResult,
	UseQueryResult,
} from "@tanstack/react-query";

export type BaseApiFunction = (...args: any[]) => Promise<any>;

export type PaginationQuery = PaginationSchema<any, any, true>["static"];

export type PaginationEndpoint = {
	post: BaseApiFunction & {
		usePagination(options?: any): UseQueryResult<PaginatedData<any>, any>;
		useInfiniteQuery(
			options?: any,
		): UseInfiniteQueryResult<InfiniteData<PaginatedData<any>>, any>;
	};
};

export type SortOrder = "asc" | "desc";
