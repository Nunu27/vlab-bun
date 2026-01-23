import type { Store } from '@frontend/types/store';
import type { DeviceInterface } from '@vlab/shared/schemas/rest';
import type {
  EdgeData,
  NodeData,
  Position,
  ResizeState,
  ViewState,
} from '../types';

export interface TopologyState {
  nodes: NodeData[];
  edges: EdgeData[];
  view: ViewState;
  selectionBox: { start: Position; current: Position } | null;
  cursorPos: Position | null;
  isDraggingNode: string | null;
  isPanning: boolean;
  resizeState: ResizeState | null;
  lastMousePos: Position;
  dragOffset: Position;
  connectMode: boolean;
  connectSource: { nodeId: string; ifaceId: string } | null;
  modalOpen: boolean;
  modalNodeId: string | null;
}

export interface ViewActions {
  setView: (view: ViewState | ((prev: ViewState) => ViewState)) => void;
  recenter: (rect: DOMRect) => void;
  zoomIn: (rect: DOMRect) => void;
  zoomOut: (rect: DOMRect) => void;
  zoomTo: (newScale: number, pivotScreen: { x: number; y: number }) => void;
}

export interface InteractionActions {
  setSelectionBox: (
    box:
      | { start: Position; current: Position }
      | null
      | ((
          prev: { start: Position; current: Position } | null,
        ) => { start: Position; current: Position } | null),
  ) => void;
  setCursorPos: (pos: Position | null) => void;
  setIsDraggingNode: (id: string | null) => void;
  setIsPanning: (isPanning: boolean) => void;
  setResizeState: (state: ResizeState | null) => void;
  setLastMousePos: (pos: Position) => void;
  setDragOffset: (pos: Position) => void;
  setConnectMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
  setConnectSource: (
    source: { nodeId: string; ifaceId: string } | null,
  ) => void;
  setModalOpen: (open: boolean) => void;
  setModalNodeId: (id: string | null) => void;
}

export interface NodesEdgesActions {
  setNodes: (nodes: NodeData[] | ((prev: NodeData[]) => NodeData[])) => void;
  setEdges: (edges: EdgeData[] | ((prev: EdgeData[]) => EdgeData[])) => void;
  deleteSelected: (
    deviceMap: Map<string, { interfaces: DeviceInterface[] }>,
  ) => void;
  addNote: (center: Position) => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
}

export interface HelperActions {
  getDepth: (nodeId: string, allNodes: NodeData[]) => number;
  recalculateGroupBounds: (currentNodes: NodeData[]) => NodeData[];
  moveNodeTree: (
    nodesToMove: NodeData[],
    dx: number,
    dy: number,
    allNodes: NodeData[],
  ) => NodeData[];
}

export interface TopologyActions
  extends ViewActions, InteractionActions, NodesEdgesActions, HelperActions {
  reset: () => void;
}

export type TopologyStore = Store<TopologyState, TopologyActions>;
