import type { Store } from '@frontend/types/store';
import type { DeviceInterface } from '@vlab/shared/schemas/rest';
import type {
  ConnectionSource,
  EdgeData,
  NodeData,
  Position,
  ResizeState,
  SelectionBox,
  ViewState,
} from '../types';

/**
 * Topology canvas state
 */
export interface TopologyState {
  // Data
  nodes: NodeData[];
  edges: EdgeData[];

  // View
  view: ViewState;

  // Interaction
  selectionBox: SelectionBox | null;
  cursorPos: Position | null;
  isDraggingNode: string | null;
  isPanning: boolean;
  resizeState: ResizeState | null;
  lastMousePos: Position;
  dragOffset: Position;

  // Connection mode
  connectMode: boolean;
  connectSource: ConnectionSource | null;

  // Modal
  modalOpen: boolean;
  modalNodeId: string | null;
}

/**
 * View manipulation actions
 */
export interface ViewActions {
  setView: (view: ViewState | ((prev: ViewState) => ViewState)) => void;
  recenter: (rect: DOMRect) => void;
  zoomIn: (rect: DOMRect) => void;
  zoomOut: (rect: DOMRect) => void;
  zoomTo: (newScale: number, pivotScreen: Position) => void;
}

/**
 * User interaction actions
 */
export interface InteractionActions {
  setSelectionBox: (
    box:
      | SelectionBox
      | null
      | ((prev: SelectionBox | null) => SelectionBox | null),
  ) => void;
  setCursorPos: (pos: Position | null) => void;
  setIsDraggingNode: (id: string | null) => void;
  setIsPanning: (isPanning: boolean) => void;
  setResizeState: (state: ResizeState | null) => void;
  setLastMousePos: (pos: Position) => void;
  setDragOffset: (pos: Position) => void;
  setConnectMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
  setConnectSource: (source: ConnectionSource | null) => void;
  setModalOpen: (open: boolean) => void;
  setModalNodeId: (id: string | null) => void;
}

/**
 * Node and edge manipulation actions
 */
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

/**
 * Helper utility actions
 */
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

/**
 * Combined topology actions
 */
export interface TopologyActions
  extends ViewActions, InteractionActions, NodesEdgesActions, HelperActions {
  reset: () => void;
}

/**
 * Complete topology store type
 */
export type TopologyStore = Store<TopologyState, TopologyActions>;
