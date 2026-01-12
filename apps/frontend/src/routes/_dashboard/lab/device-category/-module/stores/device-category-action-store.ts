import { createScopedActionStore } from '@frontend/helper/store';
import type { DeviceCategoryItem } from '../types';

const { Provider, useContext } = createScopedActionStore<DeviceCategoryItem>()([
  'create',
  'update',
  'delete',
]);

export const DeviceCategoryActionProvider = Provider;
export const useDeviceCategoryActionStore = useContext;
