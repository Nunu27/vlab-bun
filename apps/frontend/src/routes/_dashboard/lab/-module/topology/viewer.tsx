import { useEffect, useMemo, useRef } from 'react';
import { useTopologyStore, useTopologyStoreApi } from './hooks';
import type { GroupNodeData, NodeData, EdgeData } from './types';
import { BackgroundComponent } from './components/canvas/background';
import { LayersComponent } from './components/canvas/layers';
import { ControlsComponent } from './components/canvas/controls';
import { useQuery } from '@tanstack/react-query';
import api from '@frontend/lib/api';
import { getErrorMessageFromApi } from '@frontend/lib/utils';
import type { TreatyData } from '@frontend/lib/api-types';
import LoadingPage from '@frontend/components/pages/loading';

import { TopologyProvider } from './provider';

type Item = TreatyData<typeof api.device.list.get>['data'][number];
type DeviceType = Item['devices'][number];

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
  const store = useTopologyStoreApi();

  const nodes = useTopologyStore((state) => state.nodes);
  const edges = useTopologyStore((state) => state.edges);
  const view = useTopologyStore((state) => state.view);
  const setNodes = useTopologyStore((state) => state.setNodes);
  const setEdges = useTopologyStore((state) => state.setEdges);
  const reset = useTopologyStore((state) => state.reset);

  const isPanning = useTopologyStore((state) => state.isPanning);
  const lastMousePos = useTopologyStore((state) => state.lastMousePos);
  const setView = useTopologyStore((state) => state.setView);
  const setIsPanning = useTopologyStore((state) => state.setIsPanning);
  const setLastMousePos = useTopologyStore((state) => state.setLastMousePos);

  // Initialize topology
  useEffect(() => {
    reset();
    if (topology) {
      if (topology.nodes) setNodes(topology.nodes);
      if (topology.edges) setEdges(topology.edges);
    }
    return () => reset();
  }, [topology, reset, setNodes, setEdges]);

  // Wheel Zoom/Pan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const { view, setView, zoomTo } = store.getState();

      if (e.ctrlKey || e.metaKey) {
        const rect = canvas.getBoundingClientRect();
        if (!rect) return;

        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(0.1, view.scale + delta), 4);

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        zoomTo(newScale, { x: mouseX, y: mouseY });
      } else if (e.shiftKey) {
        setView((v) => ({ ...v, x: v.x - e.deltaY }));
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [store]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    onNodeDoubleClick?.(nodeId);
  };

  const { data: categories, isLoading } = useQuery({
    queryKey: ['device', 'list'],
    queryFn: async () => {
      const result = await api.device.list.get();
      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }
      return result.data.data!;
    },
    staleTime: Infinity,
  });

  const deviceMap = useMemo(() => {
    const map = new Map<
      string,
      {
        icon: string;
        resources: DeviceType['resources'];
        interfaces: DeviceType['interfaces'];
        categoryColor: string;
      }
    >();
    categories?.forEach((category) => {
      category.devices.forEach((device) => {
        map.set(device.id, {
          icon: device.icon,
          resources: device.resources,
          interfaces: device.interfaces,
          categoryColor: category.color,
        });
      });
    });
    return map;
  }, [categories]);

  const sortedGroups = useMemo(() => {
    return nodes
      .filter((n): n is GroupNodeData => n.type === 'group')
      .sort((a, b) => {
        const areaA = (a.width || 0) * (a.height || 0);
        const areaB = (b.width || 0) * (b.height || 0);
        return areaB - areaA;
      });
  }, [nodes]);

  const devices = useMemo(
    () => nodes.filter((n) => n.type === 'device'),
    [nodes],
  );

  const duplicateNodeIds = useMemo(() => new Set<string>(), []);

  if (isLoading) return <LoadingPage />;

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-gray-50 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
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
            onNodeMouseDown={() => {}}
            onEdgeClick={() => {}}
            onResizeStart={() => {}}
            onNodeDoubleClick={handleNodeDoubleClick}
            deviceMap={deviceMap}
          />
        </div>
      </div>
    </div>
  );
}

export default function TopologyViewer(props: TopologyViewerProps) {
  return (
    <TopologyProvider>
      <TopologyViewerContent {...props} />
    </TopologyProvider>
  );
}
