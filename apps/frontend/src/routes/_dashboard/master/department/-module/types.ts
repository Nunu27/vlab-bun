import type api from '@frontend/lib/api';
import type {
  ExtractFields,
  ExtractFilters,
  ExtractPaginationData,
} from '@frontend/types/api';

type PaginationRequest = (typeof api)['department']['pagination'];

export type DepartmentItem = ExtractPaginationData<PaginationRequest>;
export type DepartmentFields = ExtractFields<PaginationRequest>;
export type DepartmentFilters = ExtractFilters<PaginationRequest>;
