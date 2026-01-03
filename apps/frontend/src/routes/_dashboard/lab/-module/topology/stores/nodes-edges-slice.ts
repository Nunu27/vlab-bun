import type { StateCreator } from 'zustand';
import type { TopologyStore, NodesEdgesActions } from './types';
import type { NodeData } from '../types';
import { GROUP_COLORS } from '../constants';

export const createNodesEdgesSlice: StateCreator<
  TopologyStore,
  [['zustand/immer', never]],
  [],
  NodesEdgesActions
> = (set, get) => ({
  setNodes: (nodes) =>
    set((state) => ({
      nodes: typeof nodes === 'function' ? nodes(state.nodes) : nodes,
    })),

  setEdges: (edges) =>
    set((state) => ({
      edges: typeof edges === 'function' ? edges(state.edges) : edges,
    })),

  deleteSelected: (deviceMap) => {
    const { nodes, edges, actions } = get();
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

    const finalNodes = actions.recalculateGroupBounds(
      remainingNodes.map((n) => {
        if (n.type === 'device') {
          const deviceDef = deviceMap.get(n.deviceId);
          return {
            ...n,
            interfaces: (n.interfaces || []).map((connected, index) => {
              if (!deviceDef || !deviceDef.interfaces[index]) return connected;
              const ifaceId = deviceDef.interfaces[index].displayCode;
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

    set((state) => {
      state.nodes.forEach((n) => {
        n.selected = false;
      });
      state.nodes.push(newNode);
    });
  },

  groupSelected: () => {
    const { nodes, actions } = get();
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
    set({
      nodes: actions.recalculateGroupBounds(nodesWithNewGroup),
    });
  },

  ungroupSelected: () => {
    const { nodes, actions } = get();
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

    set({
      nodes: actions.recalculateGroupBounds(currentNodes),
    });
  },
});
