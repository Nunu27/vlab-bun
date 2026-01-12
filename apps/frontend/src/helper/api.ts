/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/rules-of-hooks */
import type { Treaty } from '@elysiajs/eden';
import { getErrorMessageFromApi } from '@frontend/helper/error';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useSuspenseQuery,
  type QueryClient,
  type QueryKey,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
  type UseSuspenseQueryOptions,
  type UseSuspenseQueryResult,
} from '@tanstack/react-query';
import type Elysia from 'elysia';

// --- Configuration ---

type QueryHookConfig = {
  useQuery?: Omit<UseQueryOptions<any, any, any, any>, 'queryKey' | 'queryFn'>;
  useSuspenseQuery?: Omit<
    UseSuspenseQueryOptions<any, any, any, any>,
    'queryKey' | 'queryFn'
  >;
  useInfiniteQuery?: Omit<
    UseInfiniteQueryOptions<any, any, any, any, any>,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >;
  useMutation?: Omit<UseMutationOptions<any, any, any, any>, 'mutationFn'>;
};

let globalQueryConfig: QueryHookConfig = {};

export function setEdenQueryConfig(config: QueryHookConfig): void {
  globalQueryConfig = config;
}

// --- Types ---

type ExtractResponseData<T> =
  T extends Promise<infer R>
    ? R extends { data: infer D; error: null }
      ? D extends { success: true; data: any; message: string }
        ? D
        : D extends { success: true; data: infer ActualData }
          ? ActualData
          : D extends { success: true }
            ? D
            : D
      : never
    : never;

type ExtractErrorData<T> =
  T extends Promise<{ error: infer E }> ? (E extends null ? Error : E) : Error;

type ExtractMutationVariables<Args extends any[]> = Args extends [
  infer Body,
  ...any[],
]
  ? Body
  : void;

type QueryMethods<Args extends any[], Return> = {
  useQuery: (
    options?: Omit<
      UseQueryOptions<
        ExtractResponseData<Return>,
        ExtractErrorData<Return>,
        ExtractResponseData<Return>,
        QueryKey
      >,
      'queryKey' | 'queryFn'
    >,
  ) => UseQueryResult<ExtractResponseData<Return>, ExtractErrorData<Return>>;

  useSuspenseQuery: (
    options?: Omit<
      UseSuspenseQueryOptions<
        ExtractResponseData<Return>,
        ExtractErrorData<Return>,
        ExtractResponseData<Return>,
        QueryKey
      >,
      'queryKey' | 'queryFn'
    >,
  ) => UseSuspenseQueryResult<
    ExtractResponseData<Return>,
    ExtractErrorData<Return>
  >;

  useInfiniteQuery: (
    options: Omit<
      UseInfiniteQueryOptions<
        ExtractResponseData<Return>,
        ExtractErrorData<Return>,
        ExtractResponseData<Return>,
        QueryKey,
        any
      >,
      'queryKey' | 'queryFn'
    > & {
      initialPageParam: any;
      getNextPageParam: (
        lastPage: ExtractResponseData<Return>,
        allPages: ExtractResponseData<Return>[],
        lastPageParam: any,
        allPageParams: any[],
      ) => any;
    },
  ) => UseInfiniteQueryResult<
    ExtractResponseData<Return>,
    ExtractErrorData<Return>
  >;

  useMutation: (
    options?: Omit<
      UseMutationOptions<
        ExtractResponseData<Return>,
        Error,
        ExtractMutationVariables<Args> extends void
          ? void
          : ExtractMutationVariables<Args>,
        any
      >,
      'mutationFn'
    >,
  ) => UseMutationResult<
    ExtractResponseData<Return>,
    Error,
    ExtractMutationVariables<Args> extends void
      ? void
      : ExtractMutationVariables<Args>,
    any
  >;

  ensureQueryData: (
    queryClient: QueryClient,
  ) => Promise<ExtractResponseData<Return>>;

  invalidateQuery: (queryClient: QueryClient) => Promise<void>;
};

type TreatyWithQuery<T> = T extends (...args: infer Args) => infer Return
  ? Return extends Promise<any>
    ? ((...args: Args) => Return) & QueryMethods<Args, Return>
    : ((...args: Args) => TreatyWithQuery<Return>) & {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        [K in Exclude<keyof T, keyof Function>]: TreatyWithQuery<T[K]>;
      }
  : { [K in keyof T]: TreatyWithQuery<T[K]> };

// --- Helpers ---

async function executeEdenCall(fn: (...args: any[]) => any, args: any[]) {
  const result = await fn(...args);
  if (result.error) {
    const error = new Error(getErrorMessageFromApi(result.error.value));
    throw error;
  }
  return result.data.data;
}

// --- Hook Selectors ---

const hookSelectors: Record<string, (obj: any, path: any[]) => any> = {
  useQuery:
    (obj, path) =>
    (options = {}) =>
      useQuery({
        ...globalQueryConfig.useQuery,
        ...options,
        queryKey: path,
        queryFn: () => executeEdenCall(obj, []),
      }),

  useSuspenseQuery:
    (obj, path) =>
    (options = {}) =>
      useSuspenseQuery({
        ...globalQueryConfig.useSuspenseQuery,
        ...options,
        queryKey: path,
        queryFn: () => executeEdenCall(obj, []),
      }),

  useInfiniteQuery: (obj, path) => (options: any) => {
    const { initialPageParam, getNextPageParam, ...restOptions } = options;
    return useInfiniteQuery({
      ...globalQueryConfig.useInfiniteQuery,
      ...restOptions,
      queryKey: path,
      initialPageParam,
      getNextPageParam,
      queryFn: async ({ pageParam }) => {
        const args = [{ query: { pageParam } }];
        return executeEdenCall(obj, args);
      },
    });
  },

  useMutation:
    (obj) =>
    (options = {}) =>
      useMutation({
        ...globalQueryConfig.useMutation,
        ...options,
        mutationFn: (variables?: any) => {
          const args =
            variables === undefined || variables === null ? [] : [variables];
          return executeEdenCall(obj, args);
        },
      }),

  ensureQueryData: (obj, path) => (queryClient: QueryClient) =>
    queryClient.ensureQueryData({
      queryKey: path,
      queryFn: () => executeEdenCall(obj, []),
    }),

  invalidateQuery: (_obj, path) => (queryClient: QueryClient) =>
    queryClient.invalidateQueries({ queryKey: path }),
};

// --- Proxy Implementation ---

function createProxy(
  target: any,
  path: any[] = [],
  accumulatedArgs: any[] = [],
): any {
  return new Proxy(target, {
    get(obj, prop) {
      // Handle hook methods
      if (typeof prop === 'string' && hookSelectors[prop]) {
        const fullPath = [...path, ...accumulatedArgs];
        return hookSelectors[prop](obj, fullPath);
      }

      const value = Reflect.get(obj, prop);

      // Proxy functions and objects for chaining
      if (value && (typeof value === 'function' || typeof value === 'object')) {
        return createProxy(value, [...path, prop], accumulatedArgs);
      }
      return value;
    },

    apply(fn, thisArg, args) {
      const result = Reflect.apply(fn, thisArg, args);
      if (result instanceof Promise) return result;
      return createProxy(result, path, [...accumulatedArgs, ...args]);
    },
  });
}

export function edenQuery<
  const App extends Elysia<any, any, any, any, any, any, any>,
  TEden = Treaty.Create<App>,
>(eden: TEden): TreatyWithQuery<TEden> {
  return createProxy(eden) as TreatyWithQuery<TEden>;
}
