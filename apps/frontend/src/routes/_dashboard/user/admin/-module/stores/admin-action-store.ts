import { createScopedActionStore } from '@frontend/helper/store';
import type { AdminItem } from '../types';

const { Provider, useContext } = createScopedActionStore<AdminItem>()([
  'create',
  'update',
  'delete',
]);

export const AdminActionProvider = Provider;
export const useAdminActionStore = useContext;
