import { useMemo } from 'react';
import { X, AlertCircle, Cpu, Database, Palette } from 'lucide-react';
import { useTopologyStore } from '../hook';
import { GROUP_COLORS } from '../constants';
import api from '@frontend/lib/api';
import { useQuery } from '@tanstack/react-query';
import { getErrorMessageFromApi } from '@frontend/lib/utils';
import { Input } from '@frontend/components/ui/input';
import { FieldLabel, FieldError } from '@frontend/components/ui/field';

export default function PropertiesPanel() {
  const store = useTopologyStore();
  const nodes = store.use.nodes();
  const selectedNodes = nodes.filter((n) => n.selected);
  const { setNodes } = store.use.actions();
  const primarySelection = selectedNodes.length === 1 ? selectedNodes[0] : null;

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

  const deviceDefinition = useMemo(() => {
    if (!primarySelection || primarySelection.type !== 'device' || !categories)
      return null;
    for (const category of categories) {
      const device = category.devices.find(
        (d) => d.id === primarySelection.deviceId,
      );
      if (device) return device;
    }
    return null;
  }, [primarySelection, categories]);

  const isDuplicateName = useMemo(() => {
    if (!primarySelection) return false;
    if (primarySelection.type === 'note') return false;
    return nodes.some(
      (n) =>
        n.id !== primarySelection.id &&
        n.label === primarySelection.label &&
        n.type !== 'note',
    );
  }, [primarySelection, nodes]);

  const updateNodeColor = (color: string) => {
    if (primarySelection) {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === primarySelection.id && n.type === 'group'
            ? { ...n, color }
            : n,
        ),
      );
    }
  };

  const updateNodeResources = (
    key: 'cpu' | 'memory',
    value: string | number | undefined,
  ) => {
    if (primarySelection) {
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id === primarySelection.id && n.type === 'device') {
            const currentResources = n.resources || {};
            // If value is undefined, we might want to remove the key or set it to undefined.
            // Spreading { ...currentResources, [key]: value } works for undefined if we want to keep the key with undefined value.
            // Or we can clean it up. For now, let's just set it.
            return { ...n, resources: { ...currentResources, [key]: value } };
          }
          return n;
        }),
      );
    }
  };

  const isGroup = primarySelection && primarySelection.type === 'group';
  const isNote = primarySelection && primarySelection.type === 'note';

  if (!primarySelection) return null;

  return (
    <div className="animate-in slide-in-from-right dark:border-border dark:bg-card z-20 flex w-80 flex-col border-l border-gray-200 bg-white shadow-xl duration-300">
      <div className="dark:border-border dark:bg-card flex items-center justify-between border-b border-gray-200 bg-white p-4">
        <h2 className="dark:text-muted-foreground text-xs font-semibold tracking-wider text-gray-500 uppercase">
          Configuration
        </h2>
        <button
          onClick={() =>
            setNodes((ns) => ns.map((n) => ({ ...n, selected: false })))
          }
          className="dark:text-muted-foreground dark:hover:text-destructive text-gray-400 hover:text-red-500"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <div className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <FieldLabel
              required
              className="dark:text-muted-foreground text-xs font-semibold tracking-wide text-gray-500 uppercase"
            >
              {isGroup ? 'Group Name' : isNote ? 'Note Content' : 'Device Name'}
            </FieldLabel>

            {isNote ? (
              <textarea
                value={primarySelection.label}
                onChange={(e) =>
                  setNodes((ns) =>
                    ns.map((n) =>
                      n.id === primarySelection.id
                        ? { ...n, label: e.target.value }
                        : n,
                    ),
                  )
                }
                className="dark:border-input dark:text-foreground dark:focus:ring-ring min-h-25 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            ) : (
              <Input
                type="text"
                value={primarySelection.label}
                aria-invalid={isDuplicateName}
                onChange={(e) =>
                  setNodes((ns) =>
                    ns.map((n) =>
                      n.id === primarySelection.id
                        ? { ...n, label: e.target.value }
                        : n,
                    ),
                  )
                }
              />
            )}
            {isDuplicateName && (
              <FieldError className="text-xs">
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  <span>Name must be unique within lab</span>
                </div>
              </FieldError>
            )}
          </div>

          {/* Resources Config (Only for Devices) */}
          {!isGroup && !isNote && primarySelection.type === 'device' && (
            <div className="dark:border-border space-y-3 border-t border-gray-100 pt-2">
              <label className="dark:text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Resources
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <FieldLabel className="dark:text-muted-foreground text-[10px] font-bold text-gray-400 uppercase">
                    CPU (Cores)
                  </FieldLabel>
                  <div className="relative">
                    <Cpu
                      size={14}
                      className="dark:text-muted-foreground absolute top-2.5 left-2.5 z-10 text-gray-400"
                    />
                    <Input
                      type="number"
                      min="1"
                      value={
                        primarySelection.resources?.cpu ??
                        deviceDefinition?.resources?.cpu ??
                        ''
                      }
                      onChange={(e) =>
                        updateNodeResources(
                          'cpu',
                          e.target.value ? parseInt(e.target.value) : undefined,
                        )
                      }
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <FieldLabel className="dark:text-muted-foreground text-[10px] font-bold text-gray-400 uppercase">
                    Memory
                  </FieldLabel>
                  <div className="relative">
                    <Database
                      size={14}
                      className="dark:text-muted-foreground absolute top-2.5 left-2.5 z-10 text-gray-400"
                    />
                    <Input
                      type="text"
                      placeholder="e.g. 512M"
                      value={
                        primarySelection.resources?.memory ??
                        deviceDefinition?.resources?.memory ??
                        ''
                      }
                      onChange={(e) =>
                        updateNodeResources(
                          'memory',
                          e.target.value || undefined,
                        )
                      }
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Group Color Picker */}
          {isGroup && primarySelection.type === 'group' && (
            <div className="dark:border-border space-y-2 border-t border-gray-100 pt-2">
              <FieldLabel className="dark:text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                <Palette size={12} /> Group Color
              </FieldLabel>
              <div className="flex flex-wrap gap-2">
                {GROUP_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateNodeColor(color)}
                    className={`dark:border-input h-8 w-8 rounded-full border border-gray-200 transition-transform hover:scale-110 ${primarySelection.color === color ? 'dark:ring-ring dark:ring-offset-card ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
