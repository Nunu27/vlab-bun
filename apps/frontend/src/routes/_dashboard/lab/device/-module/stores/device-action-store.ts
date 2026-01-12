import { createScopedActionStore } from '@frontend/helper/store';
import type { DeviceItem } from '../types';

const { Provider, useContext } = createScopedActionStore<DeviceItem>()([
  'delete',
]);

export const DeviceActionProvider = Provider;
export const useDeviceActionStore = useContext;
