/** biome-ignore-all lint/suspicious/noExplicitAny: intentional loose typing for generic api function */

import type { PaginatedData } from "@jawit/common";
import type { PaginationSchemaType } from "@jawit/paginator";
import type {
	InfiniteData,
	UseInfiniteQueryResult,
	UseQueryResult,
} from "@tanstack/react-query";

export type BaseApiFunction = (...args: any[]) => Promise<any>;

export type PaginationQuery = PaginationSchemaType<any, any, true>;

export type PaginationEndpoint = {
	post: BaseApiFunction & {
		usePagination(options?: {
			args?: PaginationQuery;
			[key: string]: unknown;
		}): UseQueryResult<PaginatedData<any>, any>;
		useInfiniteQuery(options?: {
			args?: Omit<PaginationQuery, "page">;
			getArgs?: (page: number, args: PaginationQuery) => PaginationQuery;
			[key: string]: unknown;
		}): UseInfiniteQueryResult<InfiniteData<PaginatedData<any>>, any>;
	};
};

export type SortOrder = "asc" | "desc";
