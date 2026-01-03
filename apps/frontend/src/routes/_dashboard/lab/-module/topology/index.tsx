import LoadingPage from '@frontend/components/pages/loading';
import api from '@frontend/lib/api';
import { getErrorMessageFromApi } from '@frontend/lib/utils';
import type { TreatyData } from '@frontend/types/api';
import { useQuery } from '@tanstack/react-query';
import { Unplug } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { BackgroundComponent } from './components/canvas/background';
import { ControlsComponent } from './components/canvas/controls';
import { LayersComponent } from './components/canvas/layers';
import InterfaceModal from './components/interface-modal';
import PalettePanel from './components/palette';
import PropertiesPanel from './components/properties-panel';
import Toolbar from './components/toolbar';
import type {
  DeviceNodeData,
  EdgeData,
  GroupNodeData,
  NoteNodeData,
} from './types';
import { snapToGrid } from './utils';
import { useTopologyStore } from './hook';

type Item = TreatyData<typeof api.device.list.get>['data'][number];
type DeviceType = Item['devices'][number];
type NodeType = DeviceType & {
  category: string;
};

export default function TopologyEditor() {
  const store = useTopologyStore();

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

  const nodes = store.use.nodes();
  const edges = store.use.edges();
  const view = store.use.view();
  const selectionBox = store.use.selectionBox();
  const connectMode = store.use.connectMode();
  const connectSource = store.use.connectSource();
  const cursorPos = store.use.cursorPos();
  const isDraggingNode = store.use.isDraggingNode();
  const isPanning = store.use.isPanning();
  const resizeState = store.use.resizeState();
  const lastMousePos = store.use.lastMousePos();
  const dragOffset = store.use.dragOffset();
  const modalOpen = store.use.modalOpen();
  const modalNodeId = store.use.modalNodeId();

  const {
    setNodes,
    setEdges,
    setView,
    setSelectionBox,
    setCursorPos,
    setIsDraggingNode,
    setIsPanning,
    setResizeState,
    setLastMousePos,
    setDragOffset,
    setConnectMode,
    setConnectSource,
    setModalOpen,
    setModalNodeId,
    recalculateGroupBounds,
    moveNodeTree,
    getDepth,
  } = store.use.actions();

  const canvasRef = useRef<HTMLDivElement>(null);

  const duplicateNodeIds = useMemo(() => {
    const counts = new Map<string, number>();
    nodes.forEach((n) => {
      if (n.type === 'note') return;
      counts.set(n.label, (counts.get(n.label) || 0) + 1);
    });
    return new Set(
      nodes
        .filter((n) => n.type === 'device' && (counts.get(n.label) || 0) > 1)
        .map((n) => n.id),
    );
  }, [nodes]);

  const sortedGroups = useMemo(() => {
    return nodes
      .filter((n): n is GroupNodeData => n.type === 'group')
      .sort((a, b) => {
        const depthA = getDepth(a.id, nodes);
        const depthB = getDepth(b.id, nodes);
        return depthA - depthB;
      });
  }, [nodes, getDepth]);

  const devices = useMemo(() => {
    return nodes.filter((n) => n.type !== 'group');
  }, [nodes]);

  const activeInterfaces = useMemo(() => {
    const node = nodes.find((n) => n.id === modalNodeId);
    if (!node || node.type !== 'device') return [];

    const deviceDef = deviceMap.get(node.deviceId);
    if (!deviceDef) return [];

    return deviceDef.interfaces.map((iface, index) => ({
      ...iface,
      id: iface.displayCode,
      connected: node.interfaces[index] || false,
    }));
  }, [nodes, modalNodeId, deviceMap]);

  // Define screenToWorld early
  const screenToWorld = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (e.clientX - rect.left - view.x) / view.scale,
        y: (e.clientY - rect.top - view.y) / view.scale,
      };
    },
    [view],
  );

  // --- Effects ---

  // Auto-delete empty notes
  useEffect(() => {
    setNodes((prev) => {
      const emptyNotes = prev.filter(
        (n) =>
          n.type === 'note' &&
          !n.selected &&
          (!n.label || n.label.trim() === ''),
      );
      if (emptyNotes.length > 0) {
        return prev.filter((n) => !emptyNotes.includes(n));
      }
      return prev;
    });
  }, [nodes, setNodes]);

  // SYNC VISUAL HEIGHT TO STATE (For Notes)
  useEffect(() => {
    const noteNodes = nodes.filter((n) => n.type === 'note');
    let hasUpdates = false;
    const updates = new Map<string, number>();

    noteNodes.forEach((note) => {
      const el = document.getElementById(`node-${note.id}`);
      if (el) {
        const domHeight = el.offsetHeight;
        if (Math.abs(domHeight - note.height) > 2) {
          updates.set(note.id, domHeight);
          hasUpdates = true;
        }
      }
    });

    if (hasUpdates) {
      setNodes((prev) =>
        prev.map((n) => {
          if (updates.has(n.id)) {
            return { ...n, height: updates.get(n.id)! };
          }
          return n;
        }),
      );
    }
  }, [nodes, setNodes]);

  // --- Interaction Handlers ---

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const {
        view,
        actions: { setView, zoomTo },
      } = store.getState();

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
  }, [store, isLoading]);

  const startPan = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();

    if (connectMode) {
      if (!connectSource) {
        setModalNodeId(nodeId);
        setModalOpen(true);
      } else if (connectSource.nodeId !== nodeId) {
        setModalNodeId(nodeId);
        setModalOpen(true);
      }
      return;
    }

    const isShift = e.shiftKey;
    const node = nodes.find((n) => n.id === nodeId);

    setEdges((es) => es.map((e) => ({ ...e, selected: false })));

    if (!isShift && !node?.selected) {
      setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === nodeId })));
    } else if (isShift) {
      setNodes((ns) =>
        ns.map((n) => (n.id === nodeId ? { ...n, selected: !n.selected } : n)),
      );
    }

    if (e.button === 0) {
      setIsDraggingNode(nodeId);
      const worldPos = screenToWorld(e);
      setDragOffset({
        x: worldPos.x - (node?.x || 0),
        y: worldPos.y - (node?.y || 0),
      });
    }
  };

  const handleEdgeClick = (e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    if (connectMode) return;

    setNodes((ns) => ns.map((n) => ({ ...n, selected: false })));

    const isShift = e.shiftKey;
    setEdges((es) =>
      es.map((edge) => {
        if (edge.id === edgeId) {
          return { ...edge, selected: isShift ? !edge.selected : true };
        }
        return { ...edge, selected: isShift ? edge.selected : false };
      }),
    );
  };

  const handleResizeStart = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setResizeState({
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: node.width,
      startHeight: node.height,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e);

    if (connectMode && connectSource) {
      setCursorPos(worldPos);
    }

    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (resizeState) {
      const dx = (e.clientX - resizeState.startX) / view.scale;
      // Only allow width resizing for notes
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id === resizeState.nodeId) {
            return {
              ...n,
              width: Math.max(100, resizeState.startWidth + dx),
              // We DO NOT update height here for notes, let the useEffect sync it.
            };
          }
          return n;
        }),
      );
    } else if (isDraggingNode) {
      const rawNx = worldPos.x - dragOffset.x;
      const rawNy = worldPos.y - dragOffset.y;

      setNodes((currentNodes) => {
        const draggingNode = currentNodes.find((n) => n.id === isDraggingNode);
        if (!draggingNode) return currentNodes;

        // Use direct movement (raw) during drag for smoothness
        const dx = rawNx - draggingNode.x;
        const dy = rawNy - draggingNode.y;

        let newNodes = [...currentNodes];

        if (draggingNode.selected) {
          const nodesToMove = newNodes.filter((n) => n.selected);
          newNodes = moveNodeTree(nodesToMove, dx, dy, newNodes);
        } else {
          newNodes = moveNodeTree([draggingNode], dx, dy, newNodes);
        }

        return recalculateGroupBounds(newNodes);
      });
    } else if (selectionBox) {
      setSelectionBox((prev) => (prev ? { ...prev, current: worldPos } : null));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) setIsPanning(false);

    if (isDraggingNode) {
      // Snap-on-Release Logic
      setNodes((ns) => {
        const snapped = ns.map((n) => {
          if (
            n.id === isDraggingNode ||
            (ns.find((x) => x.id === isDraggingNode)?.selected && n.selected)
          ) {
            return { ...n, x: snapToGrid(n.x), y: snapToGrid(n.y) };
          }
          return n;
        });
        return recalculateGroupBounds(snapped);
      });
      setIsDraggingNode(null);
    }

    if (resizeState) setResizeState(null);

    if (selectionBox) {
      const x1 = Math.min(selectionBox.start.x, selectionBox.current.x);
      const x2 = Math.max(selectionBox.start.x, selectionBox.current.x);
      const y1 = Math.min(selectionBox.start.y, selectionBox.current.y);
      const y2 = Math.max(selectionBox.start.y, selectionBox.current.y);

      setNodes((ns) =>
        ns.map((n) => {
          const center = { x: n.x + n.width / 2, y: n.y + n.height / 2 };
          const selected =
            center.x >= x1 &&
            center.x <= x2 &&
            center.y >= y1 &&
            center.y <= y2;
          return {
            ...n,
            selected: e.shiftKey ? n.selected || selected : selected,
          };
        }),
      );
      setSelectionBox(null);
    }
  };

  const handleCanvasMouseLeave = (e: React.MouseEvent) => {
    handleMouseUp(e);
    setCursorPos(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (connectMode) return;
    if (e.button === 0) {
      if (!e.shiftKey) {
        setNodes((ns) => ns.map((n) => ({ ...n, selected: false })));
        setEdges((es) => es.map((e) => ({ ...e, selected: false })));
      }
      const worldPos = screenToWorld(e);
      setSelectionBox({ start: worldPos, current: worldPos });
    } else {
      startPan(e);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType');
    if (!type) return;

    const worldPos = screenToWorld(e);

    if (type === 'note') {
      const newNode: NoteNodeData = {
        id: `note-${Date.now()}`,
        type: 'note',
        label: 'New Note',
        x: snapToGrid(worldPos.x),
        y: snapToGrid(worldPos.y),
        width: 200,
        height: 100,
        selected: true,
      };
      setNodes((prev) => [
        ...prev.map((n) => ({ ...n, selected: false })),
        newNode,
      ]);
      return;
    }

    if (type === 'device') {
      const deviceDataStr = e.dataTransfer.getData('deviceData');
      if (!deviceDataStr) return;
      const deviceData = JSON.parse(deviceDataStr) as NodeType;

      let newLabel = deviceData.name;
      let counter = 1;
      let isUnique = false;
      while (!isUnique) {
        const potentialLabel = `${deviceData.name}-${counter}`;
        const exists = nodes.some((n) => n.label === potentialLabel);
        if (!exists) {
          newLabel = potentialLabel;
          isUnique = true;
        } else {
          counter++;
        }
      }

      const newNode: DeviceNodeData = {
        id: `node-${Date.now()}`,
        type: 'device',
        deviceId: deviceData.id,
        label: newLabel,
        width: 60, // Default width
        height: 60, // Default height
        x: snapToGrid(worldPos.x - 30),
        y: snapToGrid(worldPos.y - 30),
        interfaces: deviceData.interfaces
          ? deviceData.interfaces.map((i) => !i.configurable)
          : [],
        resources: deviceData.resources
          ? { ...deviceData.resources }
          : { cpu: 1, memory: '512M' },
        groupIds: [],
        selected: true,
      };

      setNodes((prev) => [
        ...prev.map((n) => ({ ...n, selected: false })),
        newNode,
      ]);
    }
  };

  const handleInterfaceSelect = (ifaceId: string) => {
    if (!modalNodeId) return;
    setNodes((ns) =>
      ns.map((n) => {
        if (n.id === modalNodeId && n.type === 'device') {
          const deviceDef = deviceMap.get(n.deviceId);
          if (!deviceDef) return n;

          const ifaceIndex = deviceDef.interfaces.findIndex(
            (i) => i.displayCode === ifaceId,
          );
          if (ifaceIndex === -1) return n;

          const newInterfaces = [...(n.interfaces || [])];
          while (newInterfaces.length <= ifaceIndex) newInterfaces.push(false);
          newInterfaces[ifaceIndex] = true;

          return {
            ...n,
            interfaces: newInterfaces,
          };
        }
        return n;
      }),
    );

    if (!connectSource) {
      setConnectSource({ nodeId: modalNodeId, ifaceId });
      setModalOpen(false);
    } else {
      const newEdge: EdgeData = {
        id: `edge-${Date.now()}`,
        source: connectSource.nodeId,
        sourceHandle: connectSource.ifaceId,
        target: modalNodeId,
        targetHandle: ifaceId,
        selected: false,
      };
      setEdges((prev) => [...prev, newEdge]);
      setConnectSource(null);
      setConnectMode(false);
      setModalOpen(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we are editing a text input (like note label)
      if (
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'INPUT'
      ) {
        return;
      }

      const { nodes, connectMode, actions } = store.getState();

      switch (e.key.toLowerCase()) {
        case 'delete':
        case 'backspace':
          e.preventDefault();
          actions.deleteSelected(deviceMap);
          break;
        case 'c':
          e.preventDefault();
          actions.setConnectMode(!connectMode);
          actions.setConnectSource(null);
          break;
        case 'g':
          e.preventDefault();
          if (nodes.filter((n) => n.selected).length >= 2) {
            actions.groupSelected();
          }
          break;
        case 'u':
          e.preventDefault();
          if (nodes.some((n) => n.selected && n.type === 'group')) {
            actions.ungroupSelected();
          }
          break;
        case 'n':
          e.preventDefault();
          if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            actions.addNote({ x: rect.width / 2, y: rect.height / 2 });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store, deviceMap]);

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="bg-background text-foreground relative flex h-full w-full flex-col overflow-hidden font-sans select-none">
      <div className="relative flex flex-1 overflow-hidden">
        <PalettePanel />

        {/* --- Canvas --- */}
        <div
          id="topology-canvas"
          className="bg-background relative flex-1 overflow-hidden"
          style={{
            cursor: isPanning
              ? 'grabbing'
              : connectMode
                ? 'crosshair'
                : 'default',
          }}
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleCanvasMouseLeave}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Toolbar deviceMap={deviceMap} />

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
              selectionBox={selectionBox}
              connectMode={connectMode}
              connectSource={connectSource}
              cursorPos={cursorPos}
              onNodeMouseDown={handleNodeMouseDown}
              onEdgeClick={handleEdgeClick}
              onResizeStart={handleResizeStart}
              deviceMap={deviceMap}
            />
          </div>

          {/* Connect Mode Overlay */}
          {connectMode && (
            <div className="pointer-events-none absolute bottom-8 left-1/2 z-50 flex -translate-x-1/2 animate-pulse items-center gap-3 rounded-full bg-indigo-600 px-6 py-2 text-white shadow-xl">
              <Unplug size={18} />
              <span className="text-sm font-medium">
                {connectSource
                  ? 'Select Destination Node'
                  : 'Select Source Node'}
              </span>
            </div>
          )}
        </div>

        <PropertiesPanel />
      </div>

      <InterfaceModal
        isOpen={modalOpen}
        title={
          !connectSource
            ? 'Connect: Source Interface'
            : 'Connect: Destination Interface'
        }
        interfaces={activeInterfaces}
        onSelect={handleInterfaceSelect}
        onClose={handleModalClose}
      />
    </div>
  );
}
