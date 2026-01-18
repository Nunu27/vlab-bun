import { getErrorMessage } from '@frontend/helper/error';
import type {
  PaginatedResponse,
  PaginationParams,
  SortOrder,
} from '@frontend/types/pagination';
import { Compile } from '@sinclair/typemap';
import { type UseQueryResult } from '@tanstack/react-query';
import { t } from 'elysia';
import {
  parseAsInteger,
  parseAsJson,
  parseAsString,
  useQueryState,
  useQueryStates,
} from 'nuqs';
import { useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

const filtersSchema = Compile(
  t.Array(
    t.Object({
      field: t.String(),
      op: t.Union([
        t.Literal('eq'),
        t.Literal('ne'),
        t.Literal('gt'),
        t.Literal('gte'),
        t.Literal('lt'),
        t.Literal('lte'),
        t.Literal('like'),
        t.Literal('ilike'),
        t.Literal('nlike'),
        t.Literal('bt'),
        t.Literal('nb'),
      ]),
      value: t.Unknown(),
    }),
  ),
);

export type UsePaginationConfig<
  TData,
  TFields extends string,
  TFilters extends Array<{ field: string; op: string; value: unknown }>,
  TParams extends PaginationParams<TFields, TFilters> = PaginationParams<
    TFields,
    TFilters
  >,
> = {
  endpoint: {
    useQuery: (options: {
      args: { query: TParams };
      staleTime?: number;
      gcTime?: number;
      retry?: boolean;
      refetchOnWindowFocus?: boolean;
      refetchOnReconnect?: boolean;
    }) => UseQueryResult<PaginatedResponse<TData>>;
  };
  defaultSortBy?: TFields;
  defaultSortOrder?: SortOrder;
  defaultPerPage?: number;
  transformParams?: (params: PaginationParams<TFields, TFilters>) => TParams;
  queryOptions?: {
    staleTime?: number;
    gcTime?: number;
    retry?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
  };
};

type ExtractFilterField<T> = T extends { field: infer F } ? F : never;
type ExtractFilterByField<
  TFilters extends Array<{ field: string; op: string; value: unknown }>,
  TField,
> = Extract<TFilters[number], { field: TField }>;

export type FilterHelpers<
  TFilters extends Array<{ field: string; op: string; value: unknown }>,
> = {
  filters: TFilters;
  getFilter: <TField extends ExtractFilterField<TFilters[number]>>(
    field: TField,
  ) => ExtractFilterByField<TFilters, TField> | undefined;
  setFilter: <
    TField extends ExtractFilterField<TFilters[number]>,
    TFilter extends ExtractFilterByField<TFilters, TField> =
      ExtractFilterByField<TFilters, TField>,
  >(
    field: TField,
    op: TFilter['op'],
    value: TFilter['value'] | undefined,
  ) => void;
  removeFilter: <TField extends ExtractFilterField<TFilters[number]>>(
    field: TField,
  ) => void;
  clearFilters: () => void;
};

export type PaginationHandlers<TFields extends string> = {
  onPageChange: (page: number) => void;
  onPageSizeChange: (perPage: number) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sortBy: TFields | undefined, sortOrder: SortOrder) => void;
  onRefresh: () => void;
};

export type UsePaginationResult<
  TData,
  TFields extends string,
  TFilters extends Array<{ field: string; op: string; value: unknown }>,
> = {
  data: PaginatedResponse<TData> | undefined;
  isLoading: boolean;
  isFetching: boolean;
  query: UseQueryResult<PaginatedResponse<TData>>;
  params: PaginationParams<TFields, TFilters>;
  handlers: PaginationHandlers<TFields>;
  filterHelpers: FilterHelpers<TFilters>;
};

export function usePagination<
  TData,
  TFields extends string,
  TFilters extends Array<{ field: string; op: string; value: unknown }>,
  TParams extends PaginationParams<TFields, TFilters> = PaginationParams<
    TFields,
    TFilters
  >,
>(
  config: UsePaginationConfig<TData, TFields, TFilters, TParams>,
): UsePaginationResult<TData, TFields, TFilters> {
  const {
    endpoint,
    defaultSortBy = 'id' as TFields,
    defaultSortOrder = 'desc',
    defaultPerPage = 10,
    transformParams,
    queryOptions,
  } = config;

  const [{ page, perPage }, setPagination] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(defaultPerPage),
  });

  const [search, setSearch] = useQueryState(
    'search',
    parseAsString.withDefault(''),
  );

  const [{ sortBy, sortOrder }, setSorting] = useQueryStates({
    sortBy: parseAsString.withDefault(defaultSortBy),
    sortOrder: parseAsString.withDefault(defaultSortOrder),
  });

  const [filters, setFilters] = useQueryState(
    'filters',
    parseAsJson<TFilters>((value) => {
      if (filtersSchema.Check(value)) {
        return value as TFilters;
      }
      return null;
    }).withDefault([] as unknown as TFilters),
  );

  const apiParams = useMemo(() => {
    const baseParams: PaginationParams<TFields, TFilters> = {
      page,
      perPage,
      search: search || undefined,
      sortBy: sortBy as TFields,
      sortOrder: sortOrder as SortOrder,
      filters: filters as TFilters,
    };

    return transformParams
      ? transformParams(baseParams)
      : (baseParams as TParams);
  }, [page, perPage, search, sortBy, sortOrder, filters, transformParams]);

  const query = endpoint.useQuery({
    args: { query: apiParams },
    ...queryOptions,
  });

  const handlers: PaginationHandlers<TFields> = useMemo(
    () => ({
      onPageChange: (newPage: number) => {
        setPagination((state) => ({ ...state, page: newPage }));
      },
      onPageSizeChange: (newPerPage: number) => {
        setPagination({ page: 1, perPage: newPerPage });
      },
      onSearchChange: (newSearch: string) => {
        setSearch(newSearch);
        setPagination((state) => ({ ...state, page: 1 }));
      },
      onSortChange: (
        newSortBy: TFields | undefined,
        newSortOrder: SortOrder,
      ) => {
        setSorting(
          newSortBy
            ? { sortBy: newSortBy, sortOrder: newSortOrder }
            : { sortBy: defaultSortBy, sortOrder: defaultSortOrder },
        );
        setPagination((state) => ({ ...state, page: 1 }));
      },
      onRefresh: () => query.refetch(),
    }),
    [
      setPagination,
      setSearch,
      setSorting,
      query,
      defaultSortBy,
      defaultSortOrder,
    ],
  );

  const getFilter = useCallback(
    <TField extends ExtractFilterField<TFilters[number]>>(field: TField) => {
      return filters.find((f) => f.field === field) as
        | ExtractFilterByField<TFilters, TField>
        | undefined;
    },
    [filters],
  );

  const setFilter = useCallback(
    <
      TField extends ExtractFilterField<TFilters[number]>,
      TFilter extends ExtractFilterByField<TFilters, TField> =
        ExtractFilterByField<TFilters, TField>,
    >(
      field: TField,
      op: TFilter['op'],
      value: TFilter['value'] | undefined,
    ) => {
      const updated = filters.filter((f) => f.field !== field);

      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value) && value.length === 0) {
          setFilters(updated as TFilters);
          setPagination((state) => ({ ...state, page: 1 }));
          return;
        }
        updated.push({ field, op, value } as TFilters[number]);
      }

      setFilters(updated as TFilters);
      setPagination((state) => ({ ...state, page: 1 }));
    },
    [filters, setFilters, setPagination],
  );

  const removeFilter = useCallback(
    <TField extends ExtractFilterField<TFilters[number]>>(field: TField) => {
      const updated = filters.filter((f) => f.field !== field);
      setFilters(updated as TFilters);
      setPagination((state) => ({ ...state, page: 1 }));
    },
    [filters, setFilters, setPagination],
  );

  const clearFilters = useCallback(() => {
    setFilters([] as unknown as TFilters);
    setPagination((state) => ({ ...state, page: 1 }));
  }, [setFilters, setPagination]);

  const filterHelpers: FilterHelpers<TFilters> = useMemo(
    () => ({
      filters: filters as TFilters,
      getFilter,
      setFilter,
      removeFilter,
      clearFilters,
    }),
    [filters, getFilter, setFilter, removeFilter, clearFilters],
  );

  useEffect(() => {
    if (query.error) {
      toast.error(getErrorMessage(query.error));
    }
  }, [query.error]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    query,
    params: apiParams,
    handlers,
    filterHelpers,
  };
}
