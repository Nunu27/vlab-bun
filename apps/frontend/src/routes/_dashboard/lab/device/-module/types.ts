import type api from '@frontend/lib/api';
import type {
  ExtractFields,
  ExtractFilters,
  ExtractPaginationData,
} from '@frontend/types/api';

type PaginationRequest = (typeof api)['device']['pagination'];

export type DeviceItem = ExtractPaginationData<PaginationRequest>;
export type DeviceFields = ExtractFields<PaginationRequest>;
export type DeviceFilters = ExtractFilters<PaginationRequest>;
