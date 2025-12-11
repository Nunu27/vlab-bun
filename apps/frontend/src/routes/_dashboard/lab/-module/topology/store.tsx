import { createStore, useStore } from 'zustand';
import { createContext, useContext } from 'react';
import type {
  NodeData,
  EdgeData,
  ViewState,
  Position,
  ResizeState,
} from './types';
import { GROUP_COLORS, GROUP_PADDING } from './constants';

interface TopologyState {
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

  // Actions
  setNodes: (nodes: NodeData[] | ((prev: NodeData[]) => NodeData[])) => void;
  setEdges: (edges: EdgeData[] | ((prev: EdgeData[]) => EdgeData[])) => void;
  setView: (view: ViewState | ((prev: ViewState) => ViewState)) => void;
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
  reset: () => void;

  // Complex Actions
  deleteSelected: (
    deviceMap: Map<string, { interfaces: { internalCode: string }[] }>,
  ) => void;
  addNote: (center: Position) => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  recenter: (rect: DOMRect) => void;
  zoomIn: (rect: DOMRect) => void;
  zoomOut: (rect: DOMRect) => void;
  zoomTo: (newScale: number, pivotScreen: { x: number; y: number }) => void;

  // Helpers
  getDepth: (nodeId: string, allNodes: NodeData[]) => number;
  recalculateGroupBounds: (currentNodes: NodeData[]) => NodeData[];
  moveNodeTree: (
    nodesToMove: NodeData[],
    dx: number,
    dy: number,
    allNodes: NodeData[],
  ) => NodeData[];
}

export const createTopologyStore = () =>
  createStore<TopologyState>((set, get) => ({
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

    setNodes: (nodes) =>
      set((state) => ({
        nodes: typeof nodes === 'function' ? nodes(state.nodes) : nodes,
      })),
    setEdges: (edges) =>
      set((state) => ({
        edges: typeof edges === 'function' ? edges(state.edges) : edges,
      })),
    setView: (view) =>
      set((state) => ({
        view: typeof view === 'function' ? view(state.view) : view,
      })),
    setSelectionBox: (box) =>
      set((state) => ({
        selectionBox: typeof box === 'function' ? box(state.selectionBox) : box,
      })),
    setCursorPos: (pos) => set({ cursorPos: pos }),
    setIsDraggingNode: (id) => set({ isDraggingNode: id }),
    setIsPanning: (isPanning) => set({ isPanning }),
    setResizeState: (state) => set({ resizeState: state }),
    setLastMousePos: (pos) => set({ lastMousePos: pos }),
    setDragOffset: (pos) => set({ dragOffset: pos }),
    setConnectMode: (mode) =>
      set((state) => ({
        connectMode:
          typeof mode === 'function' ? mode(state.connectMode) : mode,
      })),
    setConnectSource: (source) => set({ connectSource: source }),
    setModalOpen: (open) => set({ modalOpen: open }),
    setModalNodeId: (id) => set({ modalNodeId: id }),
    reset: () =>
      set({
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
      }),

    getDepth: (nodeId, allNodes) => {
      const node = allNodes.find((n) => n.id === nodeId);
      if (!node) return 0;
      if (node.type === 'device' && node.groupIds?.length === 0) return 0;

      let maxDepth = 0;
      if (node.type === 'device' && node.groupIds) {
        for (const pid of node.groupIds) {
          const d = 1 + get().getDepth(pid, allNodes);
          if (d > maxDepth) maxDepth = d;
        }
      }
      return maxDepth;
    },

    recalculateGroupBounds: (currentNodes) => {
      const nodeMap = new Map(currentNodes.map((n) => [n.id, n]));
      const groups = currentNodes.filter((n) => n.type === 'group');

      const sortedGroups = [...groups].sort(
        (a, b) =>
          get().getDepth(b.id, currentNodes) -
          get().getDepth(a.id, currentNodes),
      );

      const groupsToRemove = new Set<string>();

      sortedGroups.forEach((group) => {
        const members = currentNodes.filter(
          (n) =>
            n.type === 'device' &&
            n.groupIds?.includes(group.id) &&
            !groupsToRemove.has(n.id),
        );

        if (members.length > 0) {
          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

          members.forEach((member) => {
            const currentMember = nodeMap.get(member.id)!;
            minX = Math.min(minX, currentMember.x);
            minY = Math.min(minY, currentMember.y);
            maxX = Math.max(maxX, currentMember.x + currentMember.width);
            maxY = Math.max(maxY, currentMember.y + currentMember.height);
          });

          const newGroup = {
            ...nodeMap.get(group.id)!,
            x: minX - GROUP_PADDING,
            y: minY - GROUP_PADDING,
            width: maxX - minX + GROUP_PADDING * 2,
            height: maxY - minY + GROUP_PADDING * 2,
          };
          nodeMap.set(group.id, newGroup);
        } else {
          groupsToRemove.add(group.id);
        }
      });

      return Array.from(nodeMap.values()).filter(
        (n) => !groupsToRemove.has(n.id),
      );
    },

    moveNodeTree: (nodesToMove, dx, dy, allNodes) => {
      const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
      const queue = [...nodesToMove.map((n) => n.id)];
      const processed = new Set<string>();

      while (queue.length > 0) {
        const id = queue.shift()!;
        if (processed.has(id)) continue;
        processed.add(id);

        const node = nodeMap.get(id);
        if (!node) continue;

        nodeMap.set(id, { ...node, x: node.x + dx, y: node.y + dy });

        if (node.type === 'group') {
          const children = allNodes.filter(
            (n) => n.type === 'device' && n.groupIds?.includes(id),
          );
          children.forEach((child) => {
            if (!processed.has(child.id)) queue.push(child.id);
          });
        }
      }
      return Array.from(nodeMap.values());
    },

    deleteSelected: (deviceMap) => {
      const { nodes, edges, recalculateGroupBounds } = get();
      const nodesToDelete = nodes.filter((n) => n.selected);
      const edgesToDelete = edges.filter((e) => e.selected);

      if (nodesToDelete.length === 0 && edgesToDelete.length === 0) return;

      const allNodeIdsToDelete = new Set(nodesToDelete.map((n) => n.id));
      let foundNew = true;
      while (foundNew) {
        foundNew = false;
        nodes.forEach((n) => {
          if (allNodeIdsToDelete.has(n.id)) return;
          if (
            n.type === 'device' &&
            n.groupIds?.some((gid) => allNodeIdsToDelete.has(gid))
          ) {
            allNodeIdsToDelete.add(n.id);
            foundNew = true;
          }
        });
      }

      const remainingNodes = nodes.filter((n) => !allNodeIdsToDelete.has(n.id));
      const remainingEdges = edges.filter(
        (e) =>
          !e.selected &&
          !allNodeIdsToDelete.has(e.source) &&
          !allNodeIdsToDelete.has(e.target),
      );

      const finalNodes = recalculateGroupBounds(
        remainingNodes.map((n) => {
          if (n.type === 'device') {
            const deviceDef = deviceMap.get(n.deviceId);
            return {
              ...n,
              interfaces: (n.interfaces || []).map((connected, index) => {
                if (!deviceDef || !deviceDef.interfaces[index])
                  return connected;
                const ifaceId = deviceDef.interfaces[index].internalCode;
                return remainingEdges.some(
                  (e) =>
                    (e.source === n.id && e.sourceHandle === ifaceId) ||
                    (e.target === n.id && e.targetHandle === ifaceId),
                );
              }),
            };
          }
          return n;
        }),
      );

      set({ nodes: finalNodes, edges: remainingEdges });
    },

    addNote: (center) => {
      const { view } = get();
      const cx = (center.x - view.x) / view.scale;
      const cy = (center.y - view.y) / view.scale;

      const newNode: NodeData = {
        id: `note-${Date.now()}`,
        type: 'note',
        label: '',
        width: 120,
        height: 60,
        x: cx - 60,
        y: cy - 30,
        selected: true,
      };

      set((state) => ({
        nodes: [
          ...state.nodes.map((n) => ({ ...n, selected: false })),
          newNode,
        ],
      }));
    },

    groupSelected: () => {
      const { nodes, recalculateGroupBounds } = get();
      const selectedNodes = nodes.filter((n) => n.selected);
      if (selectedNodes.length < 2) return;

      const minX = Math.min(...selectedNodes.map((n) => n.x));
      const minY = Math.min(...selectedNodes.map((n) => n.y));

      let groupLabel = 'Group-1';
      let counter = 1;

      while (nodes.some((n) => n.label === groupLabel)) {
        counter++;
        groupLabel = `Group-${counter}`;
      }

      const groupNode: NodeData = {
        id: `group-${Date.now()}`,
        type: 'group',
        label: groupLabel,
        x: minX,
        y: minY,
        width: 100,
        height: 100,
        selected: true,
        color: GROUP_COLORS[0],
      };

      const updatedNodes = nodes.map((n) => {
        if (selectedNodes.some((selected) => selected.id === n.id)) {
          if (n.type === 'device') {
            return {
              ...n,
              groupIds: [...(n.groupIds || []), groupNode.id],
              selected: false,
            };
          }
        }
        return n;
      });

      const nodesWithNewGroup = [groupNode, ...updatedNodes];
      set({ nodes: recalculateGroupBounds(nodesWithNewGroup) });
    },

    ungroupSelected: () => {
      const { nodes, recalculateGroupBounds } = get();
      const selectedNodes = nodes.filter((n) => n.selected);
      const groupsToUngroup = selectedNodes.filter((n) => n.type === 'group');
      if (groupsToUngroup.length === 0) return;

      let currentNodes = [...nodes];
      groupsToUngroup.forEach((group) => {
        currentNodes = currentNodes.map((n) => {
          if (n.type === 'device' && n.groupIds?.includes(group.id)) {
            return {
              ...n,
              groupIds: n.groupIds.filter((id) => id !== group.id),
              selected: true,
            };
          }
          return n;
        });
        currentNodes = currentNodes.filter((n) => n.id !== group.id);
      });
      set({ nodes: recalculateGroupBounds(currentNodes) });
    },

    zoomTo: (newScale, pivotScreen) => {
      set((state) => {
        const wx = (pivotScreen.x - state.view.x) / state.view.scale;
        const wy = (pivotScreen.y - state.view.y) / state.view.scale;
        return {
          view: {
            scale: newScale,
            x: pivotScreen.x - wx * newScale,
            y: pivotScreen.y - wy * newScale,
          },
        };
      });
    },

    recenter: (rect) => {
      const { nodes } = get();
      if (nodes.length === 0) {
        set({ view: { x: 0, y: 0, scale: 1 } });
        return;
      }

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      nodes.forEach((node) => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      });

      const padding = 100;
      const contentWidth = maxX - minX + padding * 2;
      const contentHeight = maxY - minY + padding * 2;

      const scaleX = rect.width / contentWidth;
      const scaleY = rect.height / contentHeight;
      const newScale = Math.min(Math.min(scaleX, scaleY), 1);

      const contentCenterX = minX - padding + contentWidth / 2;
      const contentCenterY = minY - padding + contentHeight / 2;

      const viewportCenterX = rect.width / 2;
      const viewportCenterY = rect.height / 2;

      const newX = viewportCenterX - contentCenterX * newScale;
      const newY = viewportCenterY - contentCenterY * newScale;

      set({ view: { x: newX, y: newY, scale: newScale } });
    },

    zoomIn: (rect) => {
      const { view, zoomTo } = get();
      const center = { x: rect.width / 2, y: rect.height / 2 };
      zoomTo(Math.min(view.scale * 1.2, 4), center);
    },

    zoomOut: (rect) => {
      const { view, zoomTo } = get();
      const center = { x: rect.width / 2, y: rect.height / 2 };
      zoomTo(Math.max(view.scale / 1.2, 0.1), center);
    },
  }));

export type TopologyStore = ReturnType<typeof createTopologyStore>;

export const TopologyContext = createContext<TopologyStore | null>(null);

export function useTopologyStore(): TopologyState;
export function useTopologyStore<T>(selector: (state: TopologyState) => T): T;
export function useTopologyStore<T>(selector?: (state: TopologyState) => T) {
  const store = useContext(TopologyContext);
  if (!store) {
    throw new Error('useTopologyStore must be used within a TopologyProvider');
  }
  return useStore(store, selector as (state: TopologyState) => T);
}

export const useTopologyStoreApi = () => {
  const store = useContext(TopologyContext);
  if (!store) {
    throw new Error(
      'useTopologyStoreApi must be used within a TopologyProvider',
    );
  }
  return store;
};
