/** biome-ignore-all lint/suspicious/noExplicitAny: proxy internals require loose typing */

import type { Treaty } from "@elysia/eden";
import type { AnyElysia } from "elysia";
import {
	ALL_HOOKS,
	MUTATION_METHODS,
	PROXY_SYMBOL_HANDLERS,
	QUERY_METHODS,
	TREATY_TYPES,
} from "./constants";
import {
	createEnsureQueryData,
	createInvalidateQuery,
	createQueryOptions,
	createUseInfiniteQuery,
	createUseMutation,
	createUseQuery,
	createUseSuspenseQuery,
} from "./hooks";
import type { EdenQueryOptions, TreatyQueryProxy } from "./types";

// ---------------------------------------------------------------------------
// Hook dispatcher
// ---------------------------------------------------------------------------

const QUERY_METHOD_SET = new Set<string>(QUERY_METHODS);
const MUTATION_METHOD_SET = new Set<string>(MUTATION_METHODS);
const ALL_HOOKS_SET = new Set<string>(ALL_HOOKS);

function dispatchHook(
	prop: string,
	target: any,
	key: unknown[],
	lastMethod: string | null,
	clientOptions?: EdenQueryOptions,
): unknown {
	const isQueryMethod = lastMethod !== null && QUERY_METHOD_SET.has(lastMethod);
	const isMutationMethod =
		lastMethod !== null && MUTATION_METHOD_SET.has(lastMethod);

	switch (prop) {
		case "queryOptions":
			return isQueryMethod
				? createQueryOptions(target, key, clientOptions)
				: undefined;
		case "useQuery":
			return isQueryMethod
				? createUseQuery(target, key, clientOptions)
				: undefined;
		case "useSuspenseQuery":
			return isQueryMethod
				? createUseSuspenseQuery(target, key, clientOptions)
				: undefined;
		case "useInfiniteQuery":
			return isQueryMethod || isMutationMethod
				? createUseInfiniteQuery(target, key, clientOptions)
				: undefined;
		case "usePagination":
			return isQueryMethod || isMutationMethod
				? createUseQuery(target, key, clientOptions)
				: undefined;
		case "ensureQueryData":
			return isQueryMethod
				? createEnsureQueryData(target, key, clientOptions)
				: undefined;
		case "invalidateQuery":
			return isQueryMethod ? createInvalidateQuery(key) : undefined;
		case "useMutation":
			return isMutationMethod
				? createUseMutation(target, clientOptions)
				: undefined;
		default:
			return undefined;
	}
}

// ---------------------------------------------------------------------------
// Proxy factory
// ---------------------------------------------------------------------------

function createProxy(
	target: any,
	key: unknown[],
	lastMethod: string | null,
	clientOptions?: EdenQueryOptions,
): unknown {
	return new Proxy(target, {
		get(obj, prop, receiver) {
			if (prop in PROXY_SYMBOL_HANDLERS) {
				return PROXY_SYMBOL_HANDLERS[prop as string | symbol];
			}

			if (typeof prop !== "string") return Reflect.get(obj, prop, receiver);

			if (ALL_HOOKS_SET.has(prop)) {
				return dispatchHook(prop, obj, key, lastMethod, clientOptions);
			}

			const value = Reflect.get(obj, prop, receiver);
			if (value == null) return value;

			const type = typeof value;
			if (!TREATY_TYPES.has(type)) return value;

			const nextMethod =
				QUERY_METHOD_SET.has(prop) || MUTATION_METHOD_SET.has(prop)
					? prop
					: lastMethod;

			return createProxy(value, key.concat(prop), nextMethod, clientOptions);
		},

		apply(fn, thisArg, args) {
			const result = Reflect.apply(fn, thisArg, args);
			if (result instanceof Promise) return result;
			return createProxy(
				result,
				key.concat(...args),
				lastMethod,
				clientOptions,
			);
		},
	});
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function treatyQuery<
	TApp extends AnyElysia,
	TTreaty extends object = Treaty.Create<TApp>,
>(eden: TTreaty, options?: EdenQueryOptions): TreatyQueryProxy<TTreaty> {
	const { prefixKey = [], ...clientOptions } = options ?? {};
	return createProxy(
		eden,
		prefixKey,
		null,
		clientOptions,
	) as TreatyQueryProxy<TTreaty>;
}

export type { Treaty } from "@elysia/eden";
export { treaty } from "@elysia/eden";
