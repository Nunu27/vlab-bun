import api from '@frontend/lib/api';
import type {
  ExtractPaginationData,
  ExtractFields,
  ExtractFilters,
} from '@frontend/types/api';

type PaginationRequest = (typeof api)['user']['admin']['pagination'];

export type AdminItem = ExtractPaginationData<PaginationRequest>;
export type AdminFields = ExtractFields<PaginationRequest>;
export type AdminFilters = ExtractFilters<PaginationRequest>;
