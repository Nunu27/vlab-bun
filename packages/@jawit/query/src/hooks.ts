/** biome-ignore-all lint/suspicious/noExplicitAny: intentional for runtime hook factories */

import {
	type InfiniteData,
	type QueryClient,
	type UseBaseQueryOptions,
	type UseInfiniteQueryOptions,
	type UseMutationOptions,
	type UseSuspenseQueryOptions,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useSuspenseQuery,
} from "@tanstack/react-query";

import type { EdenQueryOptions } from "./types";

// ---------------------------------------------------------------------------
// Eden response envelope helpers
// ---------------------------------------------------------------------------

async function executeQuery(
	fn: (...args: any[]) => any,
	args: any[],
	options?: EdenQueryOptions,
) {
	const result = await fn(...args);
	if (result?.error) {
		const errVal = result.error.value ?? result.error;
		if (errVal && typeof errVal === "object" && "success" in errVal) {
			if (!errVal.success) {
				if (errVal.message && options?.onErrorMessage)
					options.onErrorMessage(errVal.message);
				throw errVal.errors ?? new Error(errVal.message ?? "API Error");
			}
		}
		throw errVal;
	}

	const payload = result?.data;
	if (payload && typeof payload === "object" && "success" in payload) {
		if (!payload.success) {
			if (payload.message && options?.onErrorMessage)
				options.onErrorMessage(payload.message);
			throw payload.errors ?? new Error(payload.message ?? "API Error");
		}
		if (payload.message && options?.onSuccessMessage)
			options.onSuccessMessage(payload.message);
		return payload.data ?? null;
	}

	return payload ?? null;
}

// ---------------------------------------------------------------------------
// Hook factories
// ---------------------------------------------------------------------------

export function createQueryOptions(
	fn: any,
	key: unknown[],
	clientOptions?: EdenQueryOptions,
) {
	return ({
		args,
		onSuccessMessage,
		onErrorMessage,
		...options
	}: { args?: any } & Record<string, any> = {}) =>
		({
			...options,
			queryKey: [...key, args],
			queryFn: () =>
				executeQuery(fn, args !== undefined ? [args] : [], {
					onSuccessMessage: onSuccessMessage ?? clientOptions?.onSuccessMessage,
					onErrorMessage: onErrorMessage ?? clientOptions?.onErrorMessage,
				}),
		}) satisfies UseBaseQueryOptions;
}

export function createUseQuery(
	fn: any,
	key: unknown[],
	clientOptions?: EdenQueryOptions,
) {
	return ({
		args,
		onSuccessMessage,
		onErrorMessage,
		...options
	}: { args?: any } & Record<string, any> = {}) =>
		useQuery({
			...options,
			queryKey: [...key, args],
			queryFn: () =>
				executeQuery(fn, args !== undefined ? [args] : [], {
					onSuccessMessage: onSuccessMessage ?? clientOptions?.onSuccessMessage,
					onErrorMessage: onErrorMessage ?? clientOptions?.onErrorMessage,
				}),
		});
}

export function createUseSuspenseQuery(
	fn: any,
	key: unknown[],
	clientOptions?: EdenQueryOptions,
) {
	return ({
		args,
		onSuccessMessage,
		onErrorMessage,
		...options
	}: { args?: any } & Record<string, any> = {}) =>
		useSuspenseQuery({
			...(options as Omit<UseSuspenseQueryOptions, "queryKey" | "queryFn">),
			queryKey: [...key, args],
			queryFn: () =>
				executeQuery(fn, args !== undefined ? [args] : [], {
					onSuccessMessage: onSuccessMessage ?? clientOptions?.onSuccessMessage,
					onErrorMessage: onErrorMessage ?? clientOptions?.onErrorMessage,
				}),
		});
}

export function createUseInfiniteQuery(
	fn: any,
	key: unknown[],
	clientOptions?: EdenQueryOptions,
) {
	return ({
		args,
		onSuccessMessage,
		onErrorMessage,
		...options
	}: { args?: any } & Record<string, any> = {}) =>
		useInfiniteQuery({
			...(options as Omit<
				UseInfiniteQueryOptions<any, any, InfiniteData<any>, any, number>,
				"queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
			>),
			queryKey: [...key, args],
			initialPageParam: 1,
			getNextPageParam: (lastPage: any) => {
				const pageInfo = lastPage?.pageInfo;
				if (pageInfo) {
					const { page, totalPages } = pageInfo;
					return page < totalPages ? page + 1 : undefined;
				}
				return undefined;
			},
			queryFn: ({ pageParam = 1 }) =>
				executeQuery(fn, [args(pageParam as number)], {
					onSuccessMessage: onSuccessMessage ?? clientOptions?.onSuccessMessage,
					onErrorMessage: onErrorMessage ?? clientOptions?.onErrorMessage,
				}),
		});
}

export function createUseMutation(fn: any, clientOptions?: EdenQueryOptions) {
	return ({
		onSuccessMessage,
		onErrorMessage,
		...options
	}: Omit<UseMutationOptions<any, any, any>, "mutationFn"> & {
		onSuccessMessage?: (m: string) => void;
		onErrorMessage?: (m: string) => void;
	} = {}) =>
		useMutation({
			...options,
			mutationFn: (variables?: any) => {
				const args =
					variables === undefined || variables === null ? [] : [variables];
				return executeQuery(fn, args, {
					onSuccessMessage: onSuccessMessage ?? clientOptions?.onSuccessMessage,
					onErrorMessage: onErrorMessage ?? clientOptions?.onErrorMessage,
				});
			},
		});
}

export function createEnsureQueryData(
	fn: any,
	key: unknown[],
	clientOptions?: EdenQueryOptions,
) {
	return (queryClient: QueryClient, args?: any) =>
		queryClient.ensureQueryData({
			queryKey: [...key, args],
			queryFn: () =>
				executeQuery(fn, args !== undefined ? [args] : [], clientOptions),
		});
}

export function createInvalidateQuery(key: unknown[]) {
	return (queryClient: QueryClient) =>
		queryClient.invalidateQueries({ queryKey: key });
}
