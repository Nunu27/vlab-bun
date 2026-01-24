import { Unplug } from 'lucide-react';
import React, { useRef } from 'react';
import {
  useDeviceMap,
  useTopologyData,
  useTopologyPan,
  useTopologyWheel,
  useTopologyKeyboard,
  useTopologyEffects,
  useScreenToWorld,
  useTopologyDrag,
  useTopologyResize,
  useTopologySelection,
  useTopologyEdgeInteraction,
  useTopologyConnect,
  useTopologyDrop,
} from '../hooks';
import { useTopologyStore } from '../stores';
import { BackgroundComponent } from './canvas/background';
import { ControlsComponent } from './canvas/controls';
import { LayersComponent } from './canvas/layers';
import InterfaceModal from './interface-modal';
import PalettePanel from './palette';
import PropertiesPanel from './properties-panel';
import Toolbar from './toolbar';

export default function TopologyEditor() {
  const store = useTopologyStore();

  // Use hooks for derived data
  const deviceMap = useDeviceMap();
  const { sortedGroups, devices } = useTopologyData({
    includeDepthSort: true,
  });

  const nodes = store.use.nodes();
  const edges = store.use.edges();
  const view = store.use.view();

  const canvasRef = useRef<HTMLDivElement>(null);

  // Hooks for interaction handling
  const screenToWorld = useScreenToWorld({ canvasRef });
  useTopologyWheel({ canvasRef });
  useTopologyEffects();
  useTopologyKeyboard({ canvasRef, deviceMap });
  const {
    isPanning,
    handleMouseDown: panMouseDown,
    handleMouseMove: panMouseMove,
    handleMouseUp: panMouseUp,
  } = useTopologyPan();
  const { startDrag, handleDragMove, handleDragEnd } = useTopologyDrag({
    screenToWorld,
  });
  const { startResize, handleResizeMove, handleResizeEnd } =
    useTopologyResize();
  const {
    selectionBox,
    startSelection,
    handleSelectionMove,
    handleSelectionEnd,
    selectNode,
  } = useTopologySelection({ screenToWorld });
  const { handleEdgeClick } = useTopologyEdgeInteraction();
  const {
    connectMode,
    connectSource,
    cursorPos,
    modalOpen,
    activeInterfaces,
    handleNodeClick,
    handleConnectMove,
    handleInterfaceSelect,
    handleModalClose,
  } = useTopologyConnect({ deviceMap, screenToWorld });
  const { handleDrop } = useTopologyDrop({ screenToWorld });

  // --- Interaction Handlers ---

  const startPan = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2) {
      panMouseDown(e);
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();

    if (handleNodeClick(nodeId)) {
      return;
    }

    const isShift = e.shiftKey;
    selectNode(nodeId, isShift);

    if (e.button === 0) {
      startDrag(nodeId, e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      panMouseMove(e);
      handleConnectMove(e); // Update connection line if active
      return;
    }

    if (handleConnectMove(e)) return;

    if (handleResizeMove(e)) {
      return;
    } else if (handleDragMove(e)) {
      return;
    } else {
      handleSelectionMove(e);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) panMouseUp();
    if (handleDragEnd()) return;
    if (handleResizeEnd()) return;
    handleSelectionEnd(e);
  };

  const handleCanvasMouseLeave = (e: React.MouseEvent) => {
    handleMouseUp(e);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2) {
      startPan(e);
      return;
    }

    if (connectMode) return;
    if (e.button === 0) {
      startSelection(e, !e.shiftKey);
    }
  };

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
              duplicateNodeIds={new Set()}
              selectionBox={selectionBox}
              connectMode={connectMode}
              connectSource={connectSource}
              cursorPos={cursorPos}
              onNodeMouseDown={handleNodeMouseDown}
              onEdgeClick={handleEdgeClick}
              onResizeStart={startResize}
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
