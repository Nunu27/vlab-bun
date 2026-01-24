import type {
  DeviceInterface,
  DeviceResources,
} from '@vlab/shared/schemas/rest';
import { memo, useMemo } from 'react';
import { DEFAULT_DEVICE_HEIGHT, DEFAULT_DEVICE_WIDTH } from '../../constants';
import type { EdgeData, GroupNodeData, NodeData, Position } from '../../types';
import { EdgeComponent } from './edge';
import { GroupComponent } from './group';
import { NodeComponent } from './node';

interface LayersProps {
  sortedGroups: GroupNodeData[];
  edges: EdgeData[];
  nodes: NodeData[];
  devices: NodeData[];
  duplicateNodeIds: Set<string>;
  selectionBox: { start: Position; current: Position } | null;
  connectMode: boolean;
  connectSource: { nodeId: string; ifaceId: string } | null;
  cursorPos: Position | null;
  onNodeMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onEdgeClick: (e: React.MouseEvent, edgeId: string) => void;
  onResizeStart: (e: React.MouseEvent, nodeId: string) => void;
  onNodeDoubleClick?: (e: React.MouseEvent, nodeId: string) => void;
  readOnly?: boolean;
  deviceMap: Map<
    string,
    {
      icon: string;
      categoryColor: string;
      resources: DeviceResources;
      interfaces: DeviceInterface[];
    }
  >;
}

export const LayersComponent = memo(
  ({
    sortedGroups,
    edges,
    nodes,
    devices,
    duplicateNodeIds,
    selectionBox,
    connectMode,
    connectSource,
    cursorPos,
    onNodeMouseDown,
    onEdgeClick,
    onResizeStart,
    onNodeDoubleClick,
    readOnly,
    deviceMap,
  }: LayersProps) => {
    const nodeMap = useMemo(() => {
      const map = new Map<string, NodeData>();
      nodes.forEach((n) => map.set(n.id, n));
      return map;
    }, [nodes]);

    const edgeMeta = useMemo(() => {
      const groups = new Map<string, string[]>();
      edges.forEach((edge) => {
        const ids = [edge.source, edge.target].sort();
        const key = `${ids[0]}-${ids[1]}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(edge.id);
      });

      const meta = new Map<string, { index: number; total: number }>();
      groups.forEach((edgeIds) => {
        edgeIds.forEach((id, index) => {
          meta.set(id, { index, total: edgeIds.length });
        });
      });
      return meta;
    }, [edges]);

    return (
      <>
        {/* Layer 0: Groups (Bottom) - Using SVG Rects for z-ordering */}
        <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
          {sortedGroups.map((group) => (
            <GroupComponent
              key={group.id}
              group={group}
              onMouseDown={onNodeMouseDown}
            />
          ))}
        </svg>

        {/* Layer 1: Edges (Middle) */}
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
          {edges.map((edge) => {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);
            const meta = edgeMeta.get(edge.id);
            if (!source || !target || !meta) return null;

            return (
              <EdgeComponent
                key={edge.id}
                edge={edge}
                source={source}
                target={target}
                onClick={onEdgeClick}
                edgeIndex={meta.index}
                totalParallel={meta.total}
              />
            );
          })}

          {connectMode &&
            connectSource &&
            cursorPos &&
            (() => {
              const sourceNode = nodeMap.get(connectSource.nodeId);
              if (!sourceNode) return null;
              const sx =
                sourceNode.x +
                (sourceNode.type === 'note' || sourceNode.type === 'group'
                  ? sourceNode.width / 2
                  : DEFAULT_DEVICE_WIDTH / 2);
              const sy =
                sourceNode.y +
                (sourceNode.type === 'note' || sourceNode.type === 'group'
                  ? sourceNode.height / 2
                  : DEFAULT_DEVICE_HEIGHT / 2);
              return (
                <line
                  x1={sx}
                  y1={sy}
                  x2={cursorPos.x}
                  y2={cursorPos.y}
                  className="dashed pointer-events-none stroke-indigo-500 stroke-2 opacity-60"
                  strokeDasharray="5,5"
                />
              );
            })()}
        </svg>

        {/* Layer 2: Devices (Top) */}
        <div className="pointer-events-none absolute inset-0 z-20">
          {devices.map((node) => (
            <NodeComponent
              key={node.id}
              node={node}
              connectMode={connectMode}
              duplicateNodeIds={duplicateNodeIds}
              onMouseDown={onNodeMouseDown}
              onResizeStart={onResizeStart}
              onDoubleClick={onNodeDoubleClick}
              readOnly={readOnly}
              deviceMap={deviceMap}
            />
          ))}
        </div>

        {/* Layer 3: Selection Box (Overlay) */}
        <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible">
          {selectionBox && (
            <rect
              x={Math.min(selectionBox.start.x, selectionBox.current.x)}
              y={Math.min(selectionBox.start.y, selectionBox.current.y)}
              width={Math.abs(selectionBox.current.x - selectionBox.start.x)}
              height={Math.abs(selectionBox.current.y - selectionBox.start.y)}
              className="fill-blue-500/20 stroke-blue-500 stroke-1"
            />
          )}
        </svg>
      </>
    );
  },
);
