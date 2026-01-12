import type api from '@frontend/lib/api';
import type {
  ExtractFields,
  ExtractFilters,
  ExtractPaginationData,
} from '@frontend/types/api';

type PaginationRequest = (typeof api)['user']['lecturer']['pagination'];

export type LecturerItem = ExtractPaginationData<PaginationRequest>;
export type LecturerFields = ExtractFields<PaginationRequest>;
export type LecturerFilters = ExtractFilters<PaginationRequest>;
