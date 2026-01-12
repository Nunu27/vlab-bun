import api from '@frontend/lib/api';
import type {
  ExtractFields,
  ExtractFilters,
  ExtractPaginationData,
} from '@frontend/types/api';

type PaginationRequest = (typeof api)['study-program']['pagination'];

export type StudyProgramItem = ExtractPaginationData<PaginationRequest>;
export type StudyProgramFields = ExtractFields<PaginationRequest>;
export type StudyProgramFilters = ExtractFilters<PaginationRequest>;
