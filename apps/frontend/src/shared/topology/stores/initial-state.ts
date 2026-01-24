import type { TopologyState } from './types';

/**
 * Initial state for topology store
 */
export const initialState: TopologyState = {
  nodes: [],
  edges: [],
  view: { x: 0, y: 0, scale: 1 },
  selectionBox: null,
  cursorPos: null,
  isDraggingNode: null,
  isPanning: false,
  resizeState: null,
  lastMousePos: { x: 0, y: 0 },
  dragOffset: { x: 0, y: 0 },
  connectMode: false,
  connectSource: null,
  modalOpen: false,
  modalNodeId: null,
};
