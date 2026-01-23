import { memo } from 'react';
import { GroupComponent } from './group';
import { EdgeComponent } from './edge';
import { NodeComponent } from './node';
import type { NodeData, EdgeData, GroupNodeData, Position } from '../../types';
import type {
  DeviceInterface,
  DeviceResources,
} from '@vlab/shared/schemas/rest';

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
    deviceMap,
  }: LayersProps) => {
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
            const source = nodes.find((n) => n.id === edge.source);
            const target = nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;

            return (
              <EdgeComponent
                key={edge.id}
                edge={edge}
                source={source}
                target={target}
                onClick={onEdgeClick}
                deviceMap={deviceMap}
              />
            );
          })}

          {connectMode &&
            connectSource &&
            cursorPos &&
            (() => {
              const sourceNode = nodes.find(
                (n) => n.id === connectSource.nodeId,
              );
              if (!sourceNode) return null;
              const sx = sourceNode.x + sourceNode.width / 2;
              const sy = sourceNode.y + sourceNode.height / 2;
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
