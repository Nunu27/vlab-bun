import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_DEVICE_HEIGHT, DEFAULT_DEVICE_WIDTH } from '../../constants';
import { useTopologyStore } from '../../stores';
import type { DeviceNodeData, NodeData, NoteNodeData } from '../../types';
import { getIcon } from '../../utils';

interface NodeProps {
  node: NodeData;
  connectMode: boolean;
  duplicateNodeIds: Set<string>;
  readOnly?: boolean;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onResizeStart: (e: React.MouseEvent, nodeId: string) => void;
  onDoubleClick?: (e: React.MouseEvent, nodeId: string) => void;
  deviceMap: Map<string, { icon: string; categoryColor: string }>;
}

const NoteNode = memo(
  ({
    node: _node,
    readOnly,
    onMouseDown,
    onResizeStart,
  }: Pick<
    NodeProps,
    'node' | 'readOnly' | 'onMouseDown' | 'onResizeStart'
  >) => {
    const node = _node as NoteNodeData;
    const store = useTopologyStore();
    const { setNodes } = store.use.actions();
    const [isEditing, setIsEditing] = useState(
      !readOnly &&
        !!(node.selected && (!node.content || node.content.trim() === '')),
    );
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Reset editing state when node is deselected
    useEffect(() => {
      if (!node.selected && isEditing) {
        const timer = setTimeout(() => {
          setIsEditing(false);
          if (textareaRef.current) {
            textareaRef.current.blur();
          }
          window.getSelection()?.removeAllRanges();
        }, 0);
        return () => clearTimeout(timer);
      }
    }, [node.selected, isEditing]);

    return (
      <div
        id={`node-${node.id}`}
        onMouseDown={(e) => {
          if (readOnly) return;
          if (isEditing) {
            e.stopPropagation();
            return;
          }
          onMouseDown(e, node.id);
        }}
        onDoubleClick={(e) => {
          if (readOnly) return;
          e.stopPropagation();
          setIsEditing(true);
        }}
        className={`group pointer-events-auto absolute flex flex-col rounded-lg border transition-shadow duration-200 ${
          node.selected
            ? 'dark:bg-card/50 border-dashed border-indigo-400 bg-white/50'
            : readOnly
              ? 'border-transparent bg-transparent'
              : 'dark:hover:border-border border-transparent bg-transparent hover:border-dashed hover:border-gray-300'
        }`}
        style={{
          left: node.x,
          top: node.y,
          width: node.width,
          height: 'auto',
          minHeight: 60,
          cursor: readOnly ? undefined : isEditing ? 'text' : 'grab',
        }}
      >
        <textarea
          ref={(el) => {
            textareaRef.current = el;
            if (el) {
              el.style.height = 'auto';
              el.style.height = el.scrollHeight + 'px';
              if (isEditing && node.selected) {
                el.focus();
              }
            }
          }}
          value={node.content}
          onChange={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
            setNodes((ns) =>
              ns.map((n) =>
                n.id === node.id && n.type === 'note'
                  ? { ...n, content: e.target.value }
                  : n,
              ),
            );
          }}
          onMouseDown={(e) => {
            if (isEditing) {
              e.stopPropagation();
            }
          }}
          className={`dark:text-foreground w-full resize-none overflow-hidden bg-transparent p-3 font-sans leading-relaxed font-medium text-gray-700 outline-none ${
            !isEditing
              ? 'pointer-events-none'
              : 'pointer-events-auto cursor-text'
          } ${!readOnly && !isEditing ? 'cursor-grab' : ''}`}
          placeholder={readOnly ? '' : 'Type a label...'}
          readOnly={!isEditing}
          rows={1}
        />

        {node.selected && !readOnly && (
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
      </div>
    );
  },
);

const DeviceNode = memo(
  ({
    node: _node,
    connectMode,
    duplicateNodeIds,
    onMouseDown,
    onDoubleClick,
    deviceMap,
  }: Omit<NodeProps, 'onResizeStart'>) => {
    const node = _node as DeviceNodeData;
    // @ts-expect-error - category might not exist on node if not enriched
    const fallbackCategory = node.category;

    const { deviceIcon, deviceColor } = useMemo(() => {
      const device = deviceMap.get(node.deviceId);
      if (device) {
        return { deviceIcon: device.icon, deviceColor: device.categoryColor };
      }
      return { deviceIcon: 'circle', deviceColor: fallbackCategory };
    }, [node.deviceId, fallbackCategory, deviceMap]);

    const hasToken = 'token' in node && !!node.token;

    return (
      <div
        id={`node-${node.id}`}
        onMouseDown={(e) => onMouseDown(e, node.id)}
        onDoubleClick={(e) => onDoubleClick?.(e, node.id)}
        className={`group dark:border-border dark:bg-card pointer-events-auto absolute flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow duration-200 ${
          node.selected ? 'shadow-lg ring-2 ring-indigo-500' : ''
        } ${
          connectMode && !node.selected
            ? 'cursor-pointer hover:ring-2 hover:ring-green-400'
            : ''
        } ${hasToken ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''}`}
        style={{
          left: node.x,
          top: node.y,
          width: DEFAULT_DEVICE_WIDTH,
          height: DEFAULT_DEVICE_HEIGHT,
          cursor: connectMode ? 'crosshair' : 'grab',
        }}
      >
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
            node.interfaces.some((connected) => connected)
              ? 'bg-green-500'
              : 'dark:bg-muted bg-gray-300'
          } `}
        />
        <div
          className={`dark:bg-popover/90 dark:text-popover-foreground pointer-events-none absolute top-full mt-2 rounded border bg-white/90 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-gray-600 shadow-sm transition-all ${
            duplicateNodeIds.has(node.id)
              ? 'border-2 border-red-500 text-red-600'
              : 'dark:border-border border-gray-200'
          } `}
        >
          {node.name}
        </div>
      </div>
    );
  },
);

export const NodeComponent = memo((props: NodeProps) => {
  if (props.node.type === 'note') {
    return <NoteNode {...props} />;
  }

  return <DeviceNode {...props} />;
});
