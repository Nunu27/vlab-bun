import { createScopedActionStore } from '@frontend/helper/store';
import type { DepartmentItem } from '../types';

const { Provider, useContext } = createScopedActionStore<DepartmentItem>()([
  'create',
  'update',
  'delete',
]);

export const DepartmentActionProvider = Provider;
export const useDepartmentActionStore = useContext;
