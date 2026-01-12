import type api from '@frontend/lib/api';
import type {
  ExtractFields,
  ExtractFilters,
  ExtractPaginationData,
} from '@frontend/types/api';

type PaginationRequest = (typeof api)['user']['student']['pagination'];

export type StudentItem = ExtractPaginationData<PaginationRequest>;
export type StudentFields = ExtractFields<PaginationRequest>;
export type StudentFilters = ExtractFilters<PaginationRequest>;
