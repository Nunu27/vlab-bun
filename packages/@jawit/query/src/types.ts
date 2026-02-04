/** biome-ignore-all lint/suspicious/noExplicitAny: intentional loose typing for proxy internals */

import type { Treaty } from "@elysiajs/eden";
import type {
	BaseResponse,
	FailureResponse,
	PaginatedData,
	SuccessResponse,
} from "@jawit/common";
import type {
	InfiniteData,
	QueryClient,
	UseBaseQueryOptions,
	UseInfiniteQueryOptions,
	UseInfiniteQueryResult,
	UseMutationOptions,
	UseMutationResult,
	UseQueryOptions,
	UseQueryResult,
	UseSuspenseQueryOptions,
	UseSuspenseQueryResult,
} from "@tanstack/react-query";
import type { AnyElysia } from "elysia";
import type { MUTATION_METHODS, QUERY_METHODS } from "./constants";

// ---------------------------------------------------------------------------
// Method classification
// ---------------------------------------------------------------------------

export type QueryMethod = (typeof QUERY_METHODS)[number];
export type MutationMethod = (typeof MUTATION_METHODS)[number];

// ---------------------------------------------------------------------------
// Eden response unwrapping
// ---------------------------------------------------------------------------

/** Unwrap the `data` field from a Treaty Promise response (200 status) */
export type ExtractTreatyResponse<T> = T extends Promise<infer R>
	? R extends { data: infer D; error: null }
		? D extends BaseResponse<any, any, any>
			? D
			: never
		: never
	: never;

export type ExtractTreatyData<T> =
	ExtractTreatyResponse<T> extends SuccessResponse<infer D, any> ? D : never;

/** Unwrap the `error` field from a Treaty Promise response */
export type ExtractTreatyError<T> =
	ExtractTreatyResponse<T> extends FailureResponse<infer E, any> ? E : never;

export /** Extract the first parameter type from a Treaty leaf function */
type TreatyLeafArgs<TFn> = TFn extends (params?: infer P, ...rest: any[]) => any
	? P
	: TFn extends (params: infer P, ...rest: any[]) => any
		? P
		: never;

// ---------------------------------------------------------------------------
// Per-hook option types
// ---------------------------------------------------------------------------

export type QueryOptions<TData, TError, TArgs> = Omit<
	UseQueryOptions<TData, TError, TData>,
	"queryKey" | "queryFn"
> & { args?: TArgs } & Omit<EdenQueryOptions, "prefixKey">;

export type SuspenseQueryOptions<TData, TError, TArgs> = Omit<
	UseSuspenseQueryOptions<TData, TError, TData>,
	"queryKey" | "queryFn"
> & { args?: TArgs } & Omit<EdenQueryOptions, "prefixKey">;

export type InfiniteQueryOptions<TData, TError, TArgs> = Omit<
	UseInfiniteQueryOptions<TData, TError, InfiniteData<TData>, any[]>,
	"queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
> & { args: (page: number) => TArgs } & Omit<EdenQueryOptions, "prefixKey">;

export type MutationOptions<TData, TError, TArgs> = Omit<
	UseMutationOptions<TData, TError, TArgs>,
	"mutationFn"
> &
	Omit<EdenQueryOptions, "prefixKey">;

// ---------------------------------------------------------------------------
// Hook surfaces
// ---------------------------------------------------------------------------

export type QueryHooks<TFn> = {
	queryOptions(
		options?: QueryOptions<
			ExtractTreatyData<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
			ExtractTreatyError<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
			TreatyLeafArgs<TFn>
		>,
	): UseBaseQueryOptions;

	useQuery(
		options?: QueryOptions<
			ExtractTreatyData<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
			ExtractTreatyError<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
			TreatyLeafArgs<TFn>
		>,
	): UseQueryResult<
		ExtractTreatyData<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
		ExtractTreatyError<ReturnType<Extract<TFn, (...a: any[]) => any>>>
	>;

	useSuspenseQuery(
		options?: SuspenseQueryOptions<
			ExtractTreatyData<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
			ExtractTreatyError<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
			TreatyLeafArgs<TFn>
		>,
	): UseSuspenseQueryResult<
		ExtractTreatyData<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
		ExtractTreatyError<ReturnType<Extract<TFn, (...a: any[]) => any>>>
	>;

	useInfiniteQuery: ExtractTreatyData<
		ReturnType<Extract<TFn, (...a: any[]) => any>>
	> extends PaginatedData<any>
		? (
				options?: InfiniteQueryOptions<
					ExtractTreatyData<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
					ExtractTreatyError<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
					TreatyLeafArgs<TFn>
				>,
			) => UseInfiniteQueryResult<
				InfiniteData<
					ExtractTreatyData<ReturnType<Extract<TFn, (...a: any[]) => any>>>
				>,
				ExtractTreatyError<ReturnType<Extract<TFn, (...a: any[]) => any>>>
			>
		: never;

	ensureQueryData(
		queryClient: QueryClient,
		args?: TreatyLeafArgs<TFn>,
	): Promise<ExtractTreatyData<ReturnType<Extract<TFn, (...a: any[]) => any>>>>;

	invalidateQuery(queryClient: QueryClient): Promise<void>;
};

export type MutationHooks<TFn> = {
	useMutation(
		options?: MutationOptions<
			ExtractTreatyData<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
			ExtractTreatyError<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
			TreatyLeafArgs<TFn>
		>,
	): UseMutationResult<
		ExtractTreatyData<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
		ExtractTreatyError<ReturnType<Extract<TFn, (...a: any[]) => any>>>,
		TreatyLeafArgs<TFn>
	>;
};

// ---------------------------------------------------------------------------
// Recursive proxy type
// ---------------------------------------------------------------------------

type InjectHooks<K, V> = K extends QueryMethod
	? V extends (...args: any[]) => Promise<any>
		? V & QueryHooks<V>
		: TreatyQueryProxy<V>
	: K extends MutationMethod
		? V extends (...args: any[]) => Promise<any>
			? V & MutationHooks<V>
			: TreatyQueryProxy<V>
		: TreatyQueryProxy<V>;

/**
 * Recursively walks the Treaty client type and:
 * - Intersects `QueryHooks<TFn>` onto query-method leaf functions (get, head, options)
 * - Intersects `MutationHooks<TFn>` onto mutation-method leaf functions (post, put, patch, delete)
 * - Preserves callable path-param nodes and recurses into their return type
 * - Recurses into nested object nodes
 */
export type TreatyQueryProxy<T> =
	// Callable non-Promise = path-param node, e.g. client({ id: "x" })
	T extends (...args: infer A) => infer R
		? R extends Promise<any>
			? T // raw leaf function — should not appear here outside of method keys
			: ((...args: A) => TreatyQueryProxy<R>) & {
					// biome-ignore lint/complexity/noBannedTypes: intentionally loose typing for proxy internals
					[K in Exclude<keyof T, keyof Function>]: InjectHooks<K, T[K]>;
				}
		: {
				[K in keyof T]: InjectHooks<K, T[K]>;
			};

// ---------------------------------------------------------------------------
// Public config + client types
// ---------------------------------------------------------------------------

export type TreatyClient<TApp extends AnyElysia> = Treaty.Create<TApp>;

export type EdenQueryOptions = {
	prefixKey?: unknown[];
	onSuccessMessage?: (message: string) => void;
	onErrorMessage?: (message: string) => void;
};
