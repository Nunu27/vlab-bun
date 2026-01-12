import { createScopedActionStore } from '@frontend/helper/store';
import type { LecturerItem } from '../types';

const { Provider, useContext } = createScopedActionStore<LecturerItem>()([
  'create',
  'update',
  'delete',
]);

export const LecturerActionProvider = Provider;
export const useLecturerActionStore = useContext;
