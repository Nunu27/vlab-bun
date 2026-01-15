/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Treaty } from '@elysiajs/eden';
import type { PaginatedData, SuccessResponse } from '@vlab/shared/types';

// --- Pagination Helpers ---

export type IsPaginatedResponse<T> =
  T extends PaginatedData<any> ? true : false;

// Base helper that extracts pagination item type from a Promise return type
type ExtractPaginationDataFromPromise<T> =
  T extends Promise<{
    data?: infer ResponseBody;
    error?: any;
  }>
    ? ResponseBody extends SuccessResponse<infer Data>
      ? Data extends PaginatedData<infer Item>
        ? Item
        : never
      : never
    : never;

// Extract pagination data from object with get method
export type ExtractPaginationData<T> = T extends {
  get: (...args: any[]) => infer ReturnType;
}
  ? ExtractPaginationDataFromPromise<ReturnType>
  : never;

// Extract pagination data from endpoint function
export type ExtractPaginationDataFromEndpoint<T> = T extends (
  ...args: any[]
) => infer ReturnType
  ? ExtractPaginationDataFromPromise<ReturnType>
  : never;

// Extract query parameters from endpoint function
export type ExtractQueryParams<T> = T extends (args: {
  query: infer QueryParams;
}) => any
  ? QueryParams
  : T extends (args: { query?: infer QueryParams }) => any
    ? QueryParams
    : never;

// --- Query Parameter Helpers ---

export type ExtractFields<T> = T extends {
  get: (config: { query: infer QueryParams }) => any;
}
  ? QueryParams extends { sortBy?: infer SortField }
    ? SortField extends string
      ? SortField
      : never
    : never
  : never;

export type ExtractFilters<T> = T extends {
  get: (config: { query: infer QueryParams }) => any;
}
  ? QueryParams extends { filters?: infer Filters }
    ? Filters
    : never
  : never;

// Response Helpers

export type ExtractResponse<T> =
  T extends Promise<infer R>
    ? R extends { data: infer D; error: null }
      ? D extends SuccessResponse<any>
        ? D
        : never
      : never
    : never;

export type ExtractResponseData<T> =
  T extends Promise<infer R>
    ? R extends { data: infer D; error: null }
      ? D extends SuccessResponse<infer ActualData>
        ? ActualData
        : D
      : never
    : never;

export type ExtractErrorData<T> =
  T extends Promise<{ error: infer E }> ? (E extends null ? Error : E) : Error;

// --- Standard Eden Helpers ---

export type TreatyData<T extends (...args: any[]) => Promise<any>> =
  Treaty.Data<T>;

export type TreatyResponse<T> = Treaty.TreatyResponse<{
  200: T;
}>;
