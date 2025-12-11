import api from '@frontend/lib/api';
import { useQuery } from '@tanstack/react-query';
import { getIcon } from '../utils';
import { getErrorMessageFromApi } from '@frontend/lib/utils';

export default function Palette() {
  const { data: categories } = useQuery({
    queryKey: ['device', 'list'],
    queryFn: async () => {
      const result = await api.device.list.get();

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data.data!;
    },
  });

  return (
    <div className="dark:bg-background dark:border-border z-10 flex w-64 flex-col border-r border-gray-200 bg-gray-50 shadow-lg">
      <div className="dark:border-border dark:bg-card border-b border-gray-200 bg-white p-4">
        <h2 className="dark:text-muted-foreground text-xs font-semibold tracking-wider text-gray-500 uppercase">
          Device Palette
        </h2>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {categories?.map((category) => (
          <div key={category.id}>
            <h3
              className="dark:text-muted-foreground mb-3 ml-1 text-xs font-bold text-gray-400 uppercase"
              style={{ color: category.color }}
            >
              {category.name}
            </h3>
            {category.devices.map((device) => (
              <div
                key={device.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('nodeType', 'device');
                  e.dataTransfer.setData(
                    'deviceData',
                    JSON.stringify({
                      ...device,
                      category: category.color,
                    }),
                  );
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="dark:bg-card dark:border-border dark:hover:bg-accent dark:hover:border-primary/50 group mb-2 flex cursor-grab items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-indigo-200 hover:bg-gray-50"
              >
                <div className="dark:bg-muted dark:group-hover:bg-primary/20 dark:group-hover:text-primary rounded-md bg-gray-100 p-2 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                  {getIcon(device.icon)}
                </div>
                <span className="dark:text-foreground text-sm font-medium text-gray-700">
                  {device.name}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
