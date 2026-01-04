/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/rules-of-hooks */
import type { Treaty } from '@elysiajs/eden';
import type Elysia from 'elysia';
import {
  useQuery,
  useSuspenseQuery,
  useInfiniteQuery,
  useMutation,
  type UseQueryOptions,
  type UseSuspenseQueryOptions,
  type UseInfiniteQueryOptions,
  type UseMutationOptions,
  type QueryKey,
  type QueryClient,
  type UseQueryResult,
  type UseSuspenseQueryResult,
  type UseInfiniteQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { getErrorMessageFromApi } from '@frontend/helper/error';

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
  T extends Promise<infer R>
    ? R extends { error: infer E }
      ? E extends null
        ? Error
        : E
      : Error
    : Error;

type ExtractMutationVariables<Args extends any[]> = Args extends []
  ? void
  : Args extends [infer Body, ...any[]]
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
};

type TreatyWithQuery<T> = T extends (...args: infer Args) => infer Return
  ? Return extends Promise<any>
    ? ((...args: Args) => Return) & QueryMethods<Args, Return>
    : ((...args: Args) => TreatyWithQuery<Return>) & {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        [K in Exclude<keyof T, keyof Function>]: TreatyWithQuery<T[K]>;
      }
  : { [K in keyof T]: TreatyWithQuery<T[K]> };

// --- Proxy Implementation ---

const proxyCache = new WeakMap<object, any>();

async function executeEdenCall(fn: (...args: any[]) => any, args: any[]) {
  const result = await fn(...args);
  if (result.error) {
    throw new Error(getErrorMessageFromApi(result.error.value));
  }
  return result.data.data;
}

const hookSelectors: Record<string, (obj: any, path: any[]) => any> = {
  useQuery: (obj, path) => (options: any) =>
    useQuery({
      ...globalQueryConfig.useQuery,
      ...options,
      queryKey: path,
      queryFn: () => executeEdenCall(obj, []),
    }),

  useSuspenseQuery: (obj, path) => (options: any) =>
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
        const args: any[] = [{ query: { pageParam } }];
        return executeEdenCall(obj, args);
      },
    });
  },

  useMutation: (obj) => (options: any) =>
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
};

function createProxy(target: any, path: any[] = []): any {
  if (typeof target !== 'object' && typeof target !== 'function') {
    return target;
  }

  const cached = proxyCache.get(target);
  if (cached) return cached;

  const proxy = new Proxy(target, {
    get(obj, prop, receiver) {
      if (typeof prop === 'string') {
        const hookFactory = hookSelectors[prop];
        if (hookFactory) {
          return hookFactory(obj, path);
        }
      }

      const value = Reflect.get(obj, prop, receiver);

      if (
        typeof value === 'function' ||
        (typeof value === 'object' && value !== null)
      ) {
        return createProxy(value, [...path, prop]);
      }

      return value;
    },

    apply(fn, thisArg, args) {
      const result = Reflect.apply(fn, thisArg, args);

      if (
        result &&
        (result instanceof Promise ||
          (typeof result === 'object' &&
            typeof (result as any).then === 'function'))
      ) {
        return result;
      }

      return createProxy(result, [...path, ...args]);
    },
  });

  proxyCache.set(target, proxy);
  return proxy;
}

export function edenQuery<
  const App extends Elysia<any, any, any, any, any, any, any>,
  TEden = Treaty.Create<App>,
>(eden: TEden): TreatyWithQuery<TEden> {
  return createProxy(eden) as TreatyWithQuery<TEden>;
}
