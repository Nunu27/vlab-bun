/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Treaty } from '@elysiajs/eden';
import type { PaginatedData } from '@vlab/shared/types';
import { getErrorMessageFromApi } from '@frontend/helper/error';
import {
  usePagination,
  type UsePaginationConfig,
  type UsePaginationResult,
} from '@frontend/hooks/use-pagination';
import type {
  ExtractErrorData,
  ExtractResponse,
  ExtractResponseData,
  IsPaginatedResponse,
} from '@frontend/types/api';
import {
  useForm as tanstackUseForm,
  type FormOptions,
  type ReactFormExtendedApi,
  type FormValidateOrFn,
  type FormAsyncValidateOrFn,
} from '@tanstack/react-form';
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
import type { AppFieldExtendedReactFormApi } from '@tanstack/react-form';
import type Elysia from 'elysia';

export interface ToastFunction {
  success: (message: string) => void;
  error: (message: string) => void;
}

export interface EdenQueryConfig {
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
  toast?: ToastFunction;
  useForm?: any;
}

type ExtractUseForm<T> = T extends { useForm: infer U }
  ? U extends (...args: any) => any
    ? U
    : typeof tanstackUseForm
  : typeof tanstackUseForm;

type BaseQueryOptions<TArgs> = {
  args?: TArgs;
};

export type EdenQueryOptions<TData, TError, TArgs> = Omit<
  UseQueryOptions<TData, TError, TData, QueryKey>,
  'queryKey' | 'queryFn'
> &
  BaseQueryOptions<TArgs>;

export type EdenSuspenseQueryOptions<TData, TError, TArgs> = Omit<
  UseSuspenseQueryOptions<TData, TError, TData, QueryKey>,
  'queryKey' | 'queryFn'
> &
  BaseQueryOptions<TArgs>;

export type EdenInfiniteQueryOptions<TData, TError, TArgs> = Omit<
  UseInfiniteQueryOptions<TData, TError, TData, QueryKey, number>,
  'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
> &
  BaseQueryOptions<TArgs>;

export type EdenMutationOptions<TData, TArgs> = Omit<
  UseMutationOptions<TData, Error, TArgs, any>,
  'mutationFn'
> & {
  successMessage?:
    | string
    | null
    | ((data: TData, variables: TArgs, context: any) => string | null);
  errorMessage?:
    | string
    | null
    | ((error: Error, variables: TArgs, context: any) => string | null);
};

export type EdenFormOptions<
  TUseForm extends (...args: any) => any,
  TFormData,
  TResponse,
  TError,
> = (TUseForm extends typeof tanstackUseForm
  ? Omit<
      FormOptions<
        TFormData,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any
      >,
      'onSubmit' | 'defaultValues'
    >
  : TUseForm extends (opts: infer TOptions, ...rest: any) => any
    ? Omit<TOptions, 'onSubmit' | 'defaultValues'>
    : TUseForm extends (opts?: infer TOptions, ...rest: any) => any
      ? Omit<TOptions, 'onSubmit' | 'defaultValues'>
      : Record<string, never>) & {
  defaultValues?: TFormData;
  mutation?: {
    successMessage?:
      | string
      | null
      | ((
          data: TResponse,
          variables: TFormData,
          context: any,
        ) => string | null);
    errorMessage?:
      | string
      | null
      | ((error: TError, variables: TFormData, context: any) => string | null);
    onSuccess?: (
      data: TResponse,
      variables: TFormData,
      context: any,
    ) => void | Promise<void>;
    onError?: (
      error: TError,
      variables: TFormData,
      context: any,
    ) => void | Promise<void>;
  };
};

interface QueryOnlyMethods<Args, Return> {
  useQuery: (
    options?: EdenQueryOptions<
      ExtractResponseData<Return>,
      ExtractErrorData<Return>,
      Args
    >,
  ) => UseQueryResult<ExtractResponseData<Return>, ExtractErrorData<Return>>;

  useSuspenseQuery: (
    options?: EdenSuspenseQueryOptions<
      ExtractResponseData<Return>,
      ExtractErrorData<Return>,
      Args
    >,
  ) => UseSuspenseQueryResult<
    ExtractResponseData<Return>,
    ExtractErrorData<Return>
  >;

  ensureQueryData: (
    queryClient: QueryClient,
    args?: Args,
  ) => Promise<ExtractResponseData<Return>>;
  invalidateQuery: (queryClient: QueryClient) => Promise<void>;
}

interface InfiniteQueryMethod<Args, Return> {
  useInfiniteQuery: (
    options?: EdenInfiniteQueryOptions<
      ExtractResponseData<Return>,
      ExtractErrorData<Return>,
      Args
    >,
  ) => UseInfiniteQueryResult<
    ExtractResponseData<Return>,
    ExtractErrorData<Return>
  >;
}

type ExtractComponents<F> = F extends (
  ...args: any
) => AppFieldExtendedReactFormApi<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  infer FC,
  infer FMC
>
  ? [FC, FMC]
  : never;

interface MutationMethods<
  Args,
  Return,
  TUseForm extends (...args: any) => any,
> {
  useMutation: [Args] extends [never]
    ? (
        options?: EdenMutationOptions<ExtractResponse<Return>, void>,
      ) => UseMutationResult<ExtractResponse<Return>, Error, void, any>
    : undefined extends Args
      ? (
          options?: EdenMutationOptions<ExtractResponse<Return>, Args>,
        ) => UseMutationResult<ExtractResponse<Return>, Error, Args | void, any>
      : (
          options?: EdenMutationOptions<ExtractResponse<Return>, Args>,
        ) => UseMutationResult<ExtractResponse<Return>, Error, Args, any>;

  useForm: TUseForm extends typeof tanstackUseForm
    ? <
        TOnMount extends undefined | FormValidateOrFn<Args> = undefined,
        TOnChange extends undefined | FormValidateOrFn<Args> = undefined,
        TOnChangeAsync extends undefined | FormAsyncValidateOrFn<Args> =
          undefined,
        TOnBlur extends undefined | FormValidateOrFn<Args> = undefined,
        TOnBlurAsync extends undefined | FormAsyncValidateOrFn<Args> =
          undefined,
        TOnSubmit extends undefined | FormValidateOrFn<Args> = undefined,
        TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<Args> =
          undefined,
        TOnDynamic extends undefined | FormValidateOrFn<Args> = undefined,
        TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<Args> =
          undefined,
        TOnServer extends undefined | FormAsyncValidateOrFn<Args> = undefined,
        TSubmitMeta = unknown,
      >(
        options?: EdenFormOptions<
          TUseForm,
          Args,
          ExtractResponse<Return>,
          ExtractErrorData<Return>
        >,
      ) => ReactFormExtendedApi<
        Args,
        TOnMount,
        TOnChange,
        TOnChangeAsync,
        TOnBlur,
        TOnBlurAsync,
        TOnSubmit,
        TOnSubmitAsync,
        TOnDynamic,
        TOnDynamicAsync,
        TOnServer,
        TSubmitMeta
      >
    : <
        TOnMount extends undefined | FormValidateOrFn<Args> = undefined,
        TOnChange extends undefined | FormValidateOrFn<Args> = undefined,
        TOnChangeAsync extends undefined | FormAsyncValidateOrFn<Args> =
          undefined,
        TOnBlur extends undefined | FormValidateOrFn<Args> = undefined,
        TOnBlurAsync extends undefined | FormAsyncValidateOrFn<Args> =
          undefined,
        TOnSubmit extends undefined | FormValidateOrFn<Args> = undefined,
        TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<Args> =
          undefined,
        TOnDynamic extends undefined | FormValidateOrFn<Args> = undefined,
        TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<Args> =
          undefined,
        TOnServer extends undefined | FormAsyncValidateOrFn<Args> = undefined,
        TSubmitMeta = unknown,
      >(
        options?: EdenFormOptions<
          TUseForm,
          Args,
          ExtractResponse<Return>,
          ExtractErrorData<Return>
        >,
      ) => AppFieldExtendedReactFormApi<
        Args,
        TOnMount,
        TOnChange,
        TOnChangeAsync,
        TOnBlur,
        TOnBlurAsync,
        TOnSubmit,
        TOnSubmitAsync,
        TOnDynamic,
        TOnDynamicAsync,
        TOnServer,
        TSubmitMeta,
        ExtractComponents<TUseForm>[0],
        ExtractComponents<TUseForm>[1]
      >;
}

interface PaginationMethod<Args, Return> {
  usePagination: <
    TFields extends string = Args extends { query?: { sortBy?: infer F } }
      ? F extends string
        ? F
        : string
      : string,
    TFilters extends Array<{
      field: string;
      op: string;
      value: unknown;
    }> = Args extends {
      query?: { filters?: infer F };
    }
      ? F extends Array<{ field: string; op: string; value: unknown }>
        ? F
        : Array<{ field: string; op: string; value: unknown }>
      : Array<{ field: string; op: string; value: unknown }>,
  >(
    options?: Omit<
      UsePaginationConfig<
        ExtractResponseData<Return> extends PaginatedData<infer TItem>
          ? TItem
          : unknown,
        TFields,
        TFilters
      >,
      'endpoint'
    >,
  ) => UsePaginationResult<
    ExtractResponseData<Return> extends PaginatedData<infer TItem>
      ? TItem
      : unknown,
    TFields,
    TFilters
  >;
}

type QueryMethods<
  Args extends any[],
  Return,
  TUseForm extends (...args: any) => any,
> =
  IsPaginatedResponse<ExtractResponseData<Return>> extends true
    ? QueryOnlyMethods<Args[0], Return> &
        InfiniteQueryMethod<Args[0], Return> &
        PaginationMethod<Args[0], Return>
    : QueryOnlyMethods<Args[0], Return> &
        MutationMethods<Args[0], Return, TUseForm>;

export type TreatyWithQuery<
  T,
  TUseForm extends (...args: any) => any,
> = T extends (...args: infer Args) => infer Return
  ? Return extends Promise<any>
    ? ((...args: Args) => Return) & QueryMethods<Args, Return, TUseForm>
    : ((...args: Args) => TreatyWithQuery<Return, TUseForm>) & {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        [K in Exclude<keyof T, keyof Function>]: TreatyWithQuery<
          T[K],
          TUseForm
        >;
      }
  : { [K in keyof T]: TreatyWithQuery<T[K], TUseForm> };

const PROXY_SYMBOL_HANDLERS: Record<symbol | string, any> = {
  [Symbol.toPrimitive]: () => 'EdenQueryReference',
  [Symbol.toStringTag]: 'EdenQueryReference',
  toString: () => 'EdenQueryReference',
  valueOf: () => 'EdenQueryReference',
  toJSON: () => 'EdenQueryReference',
  then: undefined,
};

async function executeMutationCall(fn: (...args: any[]) => any, args: any[]) {
  const result = await fn(...args);
  if (result.error) {
    throw new Error(getErrorMessageFromApi(result.error.value));
  }
  return result.data;
}

async function executeCall(fn: (...args: any[]) => any, args: any[]) {
  const { data } = await executeMutationCall(fn, args);
  return data;
}

function serializeQueryParams(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const serialized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      serialized[key] = JSON.stringify(value);
    } else {
      serialized[key] = value;
    }
  }
  return serialized;
}

function serializeArgs(args: any): any {
  if (!args || typeof args !== 'object') return args;

  return {
    ...args,
    query: args.query ? serializeQueryParams(args.query) : args.query,
  };
}

function resolveMessage<T extends (...args: any[]) => string | null>(
  config: string | null | T | undefined,
  ...args: Parameters<T>
): string | null {
  if (config === null || config === undefined) return null;
  if (typeof config === 'string') return config;
  return config(...args);
}

function extractDefaultMessage(data: any): string | null {
  if (data && typeof data === 'object' && 'message' in data) {
    return String(data.message);
  }
  return null;
}

function handleSuccessToast<TData, TVariables>(
  toast: ToastFunction | undefined,
  successMessage: any,
  data: TData,
  variables: TVariables,
  context: any,
): void {
  if (!toast || successMessage === null) return;

  const message =
    successMessage !== undefined
      ? resolveMessage(successMessage, data, variables, context)
      : extractDefaultMessage(data);

  if (message) toast.success(message);
}

function handleErrorToast<TVariables>(
  toast: ToastFunction | undefined,
  errorMessage: any,
  error: Error,
  variables: TVariables,
  context: any,
): void {
  if (!toast || errorMessage === null) return;

  const message =
    errorMessage !== undefined
      ? resolveMessage(errorMessage, error, variables, context)
      : error.message;

  if (message) toast.error(message);
}

function createSuccessHandler<TData, TVariables>(
  toast: ToastFunction | undefined,
  successMessage: any,
  onSuccess?: (data: TData, variables: TVariables, context: any) => any,
) {
  return (data: TData, variables: TVariables, context: any) => {
    handleSuccessToast(toast, successMessage, data, variables, context);
    return onSuccess?.(data, variables, context);
  };
}

function createErrorHandler<TVariables>(
  toast: ToastFunction | undefined,
  errorMessage: any,
  onError?: (error: Error, variables: TVariables, context: any) => any,
) {
  return (error: Error, variables: TVariables, context: any) => {
    handleErrorToast(toast, errorMessage, error, variables, context);
    return onError?.(error, variables, context);
  };
}

function createUseQuery(obj: any, path: any[], config: EdenQueryConfig = {}) {
  return ({ args, ...options }: any = {}) =>
    useQuery({
      ...config.useQuery,
      ...options,
      queryKey: [...path, args],
      queryFn: () => executeCall(obj, args ? [serializeArgs(args)] : []),
    });
}

function createUseSuspenseQuery(
  obj: any,
  path: any[],
  config: EdenQueryConfig = {},
) {
  return ({ args, ...options }: any = {}) =>
    useSuspenseQuery({
      ...config.useSuspenseQuery,
      ...options,
      queryKey: [...path, args],
      queryFn: () => executeCall(obj, args ? [serializeArgs(args)] : []),
    });
}

function createUseInfiniteQuery(
  obj: any,
  path: any[],
  config: EdenQueryConfig = {},
) {
  return ({ args: initialArgs = {}, ...options }: any = {}) =>
    useInfiniteQuery({
      ...config.useInfiniteQuery,
      ...options,
      queryKey: [...path, initialArgs],
      initialPageParam: 1,
      getNextPageParam: (lastPage: any) => {
        if (lastPage?.pageInfo) {
          const { page, totalPages } = lastPage.pageInfo;
          return page < totalPages ? page + 1 : undefined;
        }
        return undefined;
      },
      queryFn: async ({ pageParam = 1 }) => {
        const queryArgs = {
          ...initialArgs,
          query: { ...(initialArgs?.query || {}), page: pageParam },
        };
        return executeCall(obj, [serializeArgs(queryArgs)]);
      },
    });
}

function createUseMutation(obj: any, config: EdenQueryConfig = {}) {
  return (options: any = {}) => {
    const { successMessage, errorMessage, onSuccess, onError, ...restOptions } =
      options;

    return useMutation({
      ...config.useMutation,
      ...restOptions,
      mutationFn: (variables?: any) => {
        const args =
          variables === undefined || variables === null ? [] : [variables];
        return executeMutationCall(obj, args);
      },
      onSuccess: createSuccessHandler(config.toast, successMessage, onSuccess),
      onError: createErrorHandler(config.toast, errorMessage, onError),
    });
  };
}

function createUseForm(obj: any, config: EdenQueryConfig = {}) {
  return (options: any = {}) => {
    const useFormHook = (config.useForm ?? tanstackUseForm) as any;
    const { mutation, ...formOptions } = options;

    const mutationResult = useMutation({
      ...config.useMutation,
      mutationFn: (variables?: any) => {
        const args =
          variables === undefined || variables === null ? [] : [variables];
        return executeMutationCall(obj, args);
      },
      onSuccess: createSuccessHandler(
        config.toast,
        mutation?.successMessage,
        mutation?.onSuccess,
      ),
      onError: createErrorHandler(
        config.toast,
        mutation?.errorMessage,
        mutation?.onError,
      ),
    });

    return useFormHook({
      ...formOptions,
      onSubmit: async ({ value }: any) => {
        await mutationResult.mutateAsync(value);
      },
    });
  };
}

function createEnsureQueryData(obj: any, path: any[]) {
  return (queryClient: QueryClient, args?: any) =>
    queryClient.ensureQueryData({
      queryKey: [...path, args],
      queryFn: () => executeCall(obj, args ? [serializeArgs(args)] : []),
    });
}

function createInvalidateQuery(path: any[]) {
  return (queryClient: QueryClient) =>
    queryClient.invalidateQueries({ queryKey: path });
}

function createUsePagination(
  obj: any,
  path: any[],
  config: EdenQueryConfig = {},
) {
  return (options: any = {}) =>
    usePagination({
      ...options,
      endpoint: { useQuery: createUseQuery(obj, path, config) },
    });
}

const getHookSelector = (
  prop: string,
  obj: any,
  path: any[],
  config: EdenQueryConfig,
) => {
  switch (prop) {
    case 'useQuery':
      return createUseQuery(obj, path, config);
    case 'useSuspenseQuery':
      return createUseSuspenseQuery(obj, path, config);
    case 'useInfiniteQuery':
      return createUseInfiniteQuery(obj, path, config);
    case 'useMutation':
      return createUseMutation(obj, config);
    case 'useForm':
      return createUseForm(obj, config);
    case 'ensureQueryData':
      return createEnsureQueryData(obj, path);
    case 'invalidateQuery':
      return createInvalidateQuery(path);
    case 'usePagination':
      return createUsePagination(obj, path, config);
    default:
      return undefined;
  }
};

function createProxy(
  target: any,
  config: EdenQueryConfig,
  path: any[] = [],
  accumulatedArgs: any[] = [],
): any {
  return new Proxy(target, {
    get(obj, prop) {
      if (prop in PROXY_SYMBOL_HANDLERS) {
        return PROXY_SYMBOL_HANDLERS[
          prop as keyof typeof PROXY_SYMBOL_HANDLERS
        ];
      }

      if (typeof prop === 'string') {
        const fullPath = [...path, ...accumulatedArgs];
        const hook = getHookSelector(prop, obj, fullPath, config);
        if (hook) return hook;
      }

      const value = Reflect.get(obj, prop);

      if (value && (typeof value === 'function' || typeof value === 'object')) {
        return createProxy(value, config, [...path, prop], accumulatedArgs);
      }
      return value;
    },

    apply(fn, thisArg, args) {
      const result = Reflect.apply(fn, thisArg, args);

      if (result instanceof Promise) {
        return result;
      }

      return createProxy(result, config, path, [...accumulatedArgs, ...args]);
    },
  });
}

export function edenQuery<
  const App extends Elysia<any, any, any, any, any, any, any>,
  TEden = Treaty.Create<App>,
  const TConfig extends EdenQueryConfig = EdenQueryConfig,
>(
  eden: TEden,
  config: TConfig = {} as TConfig,
): TreatyWithQuery<TEden, ExtractUseForm<TConfig>> {
  return createProxy(eden, config) as TreatyWithQuery<
    TEden,
    ExtractUseForm<TConfig>
  >;
}
