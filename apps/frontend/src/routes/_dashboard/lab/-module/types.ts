import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';

export type LabItem = ExtractPaginationData<typeof api.lab.pagination>;
