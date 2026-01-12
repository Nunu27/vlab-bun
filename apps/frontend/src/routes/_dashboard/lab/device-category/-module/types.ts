import type api from '@frontend/lib/api';
import type {
  ExtractFields,
  ExtractFilters,
  ExtractPaginationData,
} from '@frontend/types/api';

type PaginationRequest = (typeof api)['device-category']['pagination'];

export type DeviceCategoryItem = ExtractPaginationData<PaginationRequest>;
export type DeviceCategoryFields = ExtractFields<PaginationRequest>;
export type DeviceCategoryFilters = ExtractFilters<PaginationRequest>;
