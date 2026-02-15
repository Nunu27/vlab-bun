/** biome-ignore-all lint/suspicious/noExplicitAny: intentional loose typing for proxy internals */

import type {
	BaseResponse,
	FailureResponse,
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
import type { MUTATION_METHODS, QUERY_METHODS } from "./constants";

// ---------------------------------------------------------------------------
// Method classification
// ---------------------------------------------------------------------------

type QueryMethod = (typeof QUERY_METHODS)[number];
type MutationMethod = (typeof MUTATION_METHODS)[number];

// ---------------------------------------------------------------------------
// Eden response unwrapping
// ---------------------------------------------------------------------------

/** Unwrap the `data` field from a Treaty Promise response (200 status) */
export type ExtractTreatyResponse<T> = T extends (
	...args: any[]
) => Promise<infer R>
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

/** Extract the first parameter type from a Treaty leaf function */
export type ExtractTreatyParams<TFn> = TFn extends (
	params: infer P,
	...rest: any[]
) => Promise<any>
	? keyof P extends never
		? // biome-ignore lint/suspicious/noConfusingVoidType: indicate no parameter
			void
		: P
	: never;

export type ExtractTreatyPaginationData<
	TEndpoint extends { post: (...args: any[]) => Promise<any> },
> =
	ExtractTreatyData<TEndpoint["post"]> extends {
		items: (infer D)[];
		pageInfo: any;
	}
		? D
		: never;

// ---------------------------------------------------------------------------
// Per-hook option types
// ---------------------------------------------------------------------------

type QueryOptions<TData, TError, TArgs> = Omit<
	UseQueryOptions<TData, TError, TData>,
	"queryKey" | "queryFn"
> & { args?: TArgs } & Omit<EdenQueryOptions, "prefixKey">;

type SuspenseQueryOptions<TData, TError, TArgs> = Omit<
	UseSuspenseQueryOptions<TData, TError, TData>,
	"queryKey" | "queryFn"
> & { args?: TArgs } & Omit<EdenQueryOptions, "prefixKey">;

type InfiniteQueryOptions<TData, TError, TArgs> = Omit<
	UseInfiniteQueryOptions<TData, TError, InfiniteData<TData>, any[]>,
	"queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
> & {
	/**
	 * Static, serializable params passed to the query.
	 * These are included in the query key so that changing them
	 * (e.g. changing `search`) triggers a fresh fetch.
	 */
	args?: Partial<TArgs> | TArgs;
	/**
	 * A function that receives the current page number and the static `args`,
	 * and returns the full request argument for that page.
	 * Defaults to merging `{ query: { page } }` into args.
	 */
	getArgs: (page: number, args: any) => TArgs;
	queryKey?: unknown[];
} & Omit<EdenQueryOptions, "prefixKey">;

type MutationOptions<TData, TError, TArgs> = Omit<
	UseMutationOptions<TData, TError, TArgs>,
	"mutationFn"
> &
	Omit<EdenQueryOptions, "prefixKey">;

// ---------------------------------------------------------------------------
// Hook surfaces
// ---------------------------------------------------------------------------

type QueryHooks<TFn> = {
	queryOptions(
		options?: QueryOptions<
			ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>,
			ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>,
			ExtractTreatyParams<TFn>
		>,
	): UseBaseQueryOptions;

	useQuery(
		options?: QueryOptions<
			ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>,
			ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>,
			ExtractTreatyParams<TFn>
		>,
	): UseQueryResult<
		ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>,
		ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>
	>;

	useSuspenseQuery(
		options?: SuspenseQueryOptions<
			ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>,
			ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>,
			ExtractTreatyParams<TFn>
		>,
	): UseSuspenseQueryResult<
		ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>,
		ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>
	>;

	usePagination: ExtractTreatyData<Extract<TFn, (...a: any[]) => any>> extends {
		items: any[];
		pageInfo: any;
	}
		? (
				options?: QueryOptions<
					ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>,
					ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>,
					ExtractTreatyParams<TFn>
				>,
			) => UseQueryResult<
				ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>,
				ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>
			>
		: never;

	useInfiniteQuery: ExtractTreatyData<
		Extract<TFn, (...a: any[]) => any>
	> extends { items: any[]; pageInfo: any }
		? (
				options?: InfiniteQueryOptions<
					ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>,
					ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>,
					ExtractTreatyParams<TFn>
				>,
			) => UseInfiniteQueryResult<
				InfiniteData<ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>>,
				ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>
			>
		: never;

	ensureQueryData(
		queryClient: QueryClient,
		args?: ExtractTreatyParams<TFn>,
	): Promise<ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>>;

	invalidateQuery(queryClient: QueryClient): Promise<void>;
};

type MutationHooks<TFn> = {
	useMutation(
		options?: MutationOptions<
			ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>,
			ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>,
			ExtractTreatyParams<TFn>
		>,
	): UseMutationResult<
		ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>,
		ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>,
		ExtractTreatyParams<TFn>
	>;

	usePagination: ExtractTreatyData<Extract<TFn, (...a: any[]) => any>> extends {
		items: any[];
		pageInfo: any;
	}
		? (
				options?: QueryOptions<
					ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>,
					ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>,
					ExtractTreatyParams<TFn>
				>,
			) => UseQueryResult<
				ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>,
				ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>
			>
		: never;

	useInfiniteQuery: ExtractTreatyData<
		Extract<TFn, (...a: any[]) => any>
	> extends { items: any[]; pageInfo: any }
		? (
				options?: InfiniteQueryOptions<
					ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>,
					ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>,
					ExtractTreatyParams<TFn>
				>,
			) => UseInfiniteQueryResult<
				InfiniteData<ExtractTreatyData<Extract<TFn, (...a: any[]) => any>>>,
				ExtractTreatyError<Extract<TFn, (...a: any[]) => any>>
			>
		: never;
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

export type EdenQueryOptions = {
	prefixKey?: unknown[];
	onSuccessMessage?: (message: string) => void;
	onErrorMessage?: (message: string) => void;
	showSuccessMessage?: boolean;
	showErrorMessage?: boolean;
};
