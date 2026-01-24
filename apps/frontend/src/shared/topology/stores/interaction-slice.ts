import type { StateCreator } from 'zustand';
import type { TopologyStore, InteractionActions } from './types';

/**
 * Interaction state slice
 * Handles user interactions like selection, dragging, panning
 */
export const createInteractionSlice: StateCreator<
  TopologyStore,
  [],
  [],
  InteractionActions
> = (set) => ({
  setSelectionBox: (box) =>
    set((state) => ({
      ...state,
      selectionBox: typeof box === 'function' ? box(state.selectionBox) : box,
    })),

  setCursorPos: (pos) => set((state) => ({ ...state, cursorPos: pos })),

  setIsDraggingNode: (id) => set((state) => ({ ...state, isDraggingNode: id })),

  setIsPanning: (isPanning) => set((state) => ({ ...state, isPanning })),

  setResizeState: (resizeState) => set((state) => ({ ...state, resizeState })),

  setLastMousePos: (pos) => set((state) => ({ ...state, lastMousePos: pos })),

  setDragOffset: (pos) => set((state) => ({ ...state, dragOffset: pos })),

  setConnectMode: (mode) =>
    set((state) => ({
      ...state,
      connectMode: typeof mode === 'function' ? mode(state.connectMode) : mode,
    })),

  setConnectSource: (source) =>
    set((state) => ({ ...state, connectSource: source })),

  setModalOpen: (open) => set((state) => ({ ...state, modalOpen: open })),

  setModalNodeId: (id) => set((state) => ({ ...state, modalNodeId: id })),
});
