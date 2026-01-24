import { useEffect, useRef } from 'react';
import {
  useDeviceMap,
  useTopologyData,
  useTopologyPan,
  useTopologyWheel,
} from '../hooks';
import { TopologyStoreProvider, useTopologyStore } from '../stores';
import type { EdgeData, NodeData } from '../types';
import { BackgroundComponent } from './canvas/background';
import { ControlsComponent } from './canvas/controls';
import { LayersComponent } from './canvas/layers';

interface TopologyViewerProps {
  topology: {
    nodes: NodeData[];
    edges: EdgeData[];
  };
  onNodeDoubleClick?: (nodeId: string) => void;
}

function TopologyViewerContent({
  topology,
  onNodeDoubleClick,
}: TopologyViewerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const store = useTopologyStore();

  const nodes = store.use.nodes();
  const edges = store.use.edges();
  const view = store.use.view();
  const { setNodes, setEdges, reset } = store.use.actions();

  // Hooks
  useTopologyWheel({ canvasRef });
  const {
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  } = useTopologyPan();
  const deviceMap = useDeviceMap();
  const { sortedGroups, devices, duplicateNodeIds } = useTopologyData();

  // Initialize topology
  useEffect(() => {
    reset();
    if (topology) {
      if (topology.nodes) setNodes(topology.nodes);
      if (topology.edges) setEdges(topology.edges);
    }
    return () => reset();
  }, [topology, reset, setNodes, setEdges]);

  const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    onNodeDoubleClick?.(nodeId);
  };

  return (
    <div
      className={`bg-background relative h-full w-full overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <div
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Zoom Controls */}
        <ControlsComponent canvasRef={canvasRef} />

        {/* Background */}
        <BackgroundComponent />

        {/* World Transform Container */}
        <div
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <LayersComponent
            sortedGroups={sortedGroups}
            edges={edges}
            nodes={nodes}
            devices={devices}
            duplicateNodeIds={duplicateNodeIds}
            selectionBox={null}
            connectMode={false}
            connectSource={null}
            cursorPos={null}
            onNodeMouseDown={handleMouseDown}
            onEdgeClick={() => {}}
            onResizeStart={() => {}}
            onNodeDoubleClick={handleNodeDoubleClick}
            readOnly={true}
            deviceMap={deviceMap}
          />
        </div>
      </div>
    </div>
  );
}

export default function TopologyViewer(props: TopologyViewerProps) {
  return (
    <TopologyStoreProvider>
      <TopologyViewerContent {...props} />
    </TopologyStoreProvider>
  );
}
