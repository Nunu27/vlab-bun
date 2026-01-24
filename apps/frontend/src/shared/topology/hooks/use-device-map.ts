import api from '@frontend/lib/api';
import type { TreatyData } from '@frontend/types/api';
import { useMemo } from 'react';

type Item = TreatyData<typeof api.device.list.get>['data'][number];
type DeviceType = Item['devices'][number];

export const useDeviceMap = () => {
  const { data: categories } = api.device.list.get.useSuspenseQuery({
    staleTime: Infinity,
  });

  return useMemo(() => {
    const map = new Map<
      string,
      {
        icon: string;
        resources: DeviceType['resources'];
        interfaces: DeviceType['interfaces'];
        categoryColor: string;
      }
    >();
    if (!categories) return map;
    for (const cat of categories) {
      for (const dev of cat.devices) {
        map.set(dev.id, {
          icon: dev.icon,
          resources: dev.resources,
          interfaces: dev.interfaces,
          categoryColor: cat.color,
        });
      }
    }
    return map;
  }, [categories]);
};
