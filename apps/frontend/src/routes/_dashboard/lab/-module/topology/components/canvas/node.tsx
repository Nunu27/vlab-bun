import { memo } from 'react';
import { useTopologyStore } from '../../store';
import type { NodeData } from '../../types';
import { getIcon } from '../../utils';

interface NodeProps {
  node: NodeData;
  connectMode: boolean;
  duplicateNodeIds: Set<string>;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onResizeStart: (e: React.MouseEvent, nodeId: string) => void;
  onDoubleClick?: (e: React.MouseEvent, nodeId: string) => void;
  deviceMap: Map<string, { icon: string; categoryColor: string }>;
}

export const NodeComponent = memo(
  ({
    node,
    connectMode,
    duplicateNodeIds,
    onMouseDown,
    onResizeStart,
    onDoubleClick,
    deviceMap,
  }: NodeProps) => {
    const setNodes = useTopologyStore((state) => state.setNodes);

    const { deviceIcon, deviceColor } = (() => {
      if (node.type !== 'device')
        return { deviceIcon: 'circle', deviceColor: '#000' };

      const device = deviceMap.get(node.deviceId);
      if (device) {
        return { deviceIcon: device.icon, deviceColor: device.categoryColor };
      }
      // @ts-expect-error - category might not exist on node if not enriched
      return { deviceIcon: 'circle', deviceColor: node.category };
    })();

    const hasToken = node.type === 'device' && 'token' in node && !!node.token;

    return (
      <div
        id={`node-${node.id}`}
        onMouseDown={(e) => onMouseDown(e, node.id)}
        onDoubleClick={(e) => onDoubleClick?.(e, node.id)}
        className={`group pointer-events-auto absolute flex flex-col rounded-lg border transition-shadow duration-200 ${
          node.type === 'note'
            ? ` ${node.selected ? 'dark:bg-card/50 border-dashed border-indigo-400 bg-white/50' : 'dark:hover:border-border border-transparent bg-transparent hover:border-dashed hover:border-gray-300'} `
            : `dark:border-border dark:bg-card items-center justify-center border-gray-200 bg-white shadow-sm ${node.selected ? 'shadow-lg ring-2 ring-indigo-500' : ''}`
        } ${connectMode && !node.selected && node.type !== 'note' ? 'cursor-pointer hover:ring-2 hover:ring-green-400' : ''} ${hasToken ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''}`}
        style={{
          left: node.x,
          top: node.y,
          width: node.width,
          height: node.type === 'note' ? 'auto' : node.height,
          minHeight: node.type === 'note' ? 60 : undefined,
          cursor:
            connectMode && node.type !== 'note'
              ? 'crosshair'
              : node.type === 'note'
                ? node.selected
                  ? 'text'
                  : 'grab'
                : 'grab',
        }}
      >
        {node.type === 'note' ? (
          <>
            <textarea
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }
              }}
              autoFocus={node.selected && (!node.label || node.label === '')}
              value={node.label}
              onChange={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
                setNodes((ns) =>
                  ns.map((n) =>
                    n.id === node.id ? { ...n, label: e.target.value } : n,
                  ),
                );
              }}
              onMouseDown={(e) => {
                if (node.selected) {
                  e.stopPropagation();
                }
              }}
              className={`dark:text-foreground w-full resize-none overflow-hidden bg-transparent p-3 font-sans leading-relaxed font-medium text-gray-700 outline-none ${!node.selected ? 'pointer-events-none cursor-grab' : 'pointer-events-auto cursor-text'} `}
              placeholder="Type a label..."
              readOnly={!node.selected}
              rows={1}
            />

            {node.selected && (
              <div
                onMouseDown={(e) => onResizeStart(e, node.id)}
                className="absolute right-0 bottom-0 flex h-6 w-6 cursor-ew-resize items-end justify-end p-1 text-indigo-400 transition-colors hover:text-indigo-600"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 2V8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M2 5H8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
          </>
        ) : (
          <>
            <div
              className="mb-1 rounded-full p-2"
              style={{
                color: deviceColor,
                backgroundColor: `${deviceColor}1A`,
              }}
            >
              {getIcon(deviceIcon)}
            </div>
            <div
              className={`dark:border-background absolute top-1 right-1 h-2 w-2 rounded-full border border-white ${
                node.type === 'device' &&
                node.interfaces?.some((connected) => connected)
                  ? 'bg-green-500'
                  : 'dark:bg-muted bg-gray-300'
              } `}
            />
            <div
              className={`dark:bg-popover/90 dark:text-popover-foreground pointer-events-none absolute top-full mt-2 rounded border bg-white/90 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-gray-600 shadow-sm transition-all ${duplicateNodeIds.has(node.id) ? 'border-2 border-red-500 text-red-600' : 'dark:border-border border-gray-200'} `}
            >
              {node.label}
            </div>
          </>
        )}
      </div>
    );
  },
);
