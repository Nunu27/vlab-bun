import type { StateCreator } from 'zustand';
import type { TopologyStore, HelperActions } from './types';
import { GROUP_PADDING } from '../constants';

export const createHelperSlice: StateCreator<
  TopologyStore,
  [],
  [],
  HelperActions
> = (_, get) => ({
  getDepth: (nodeId, allNodes) => {
    const node = allNodes.find((n) => n.id === nodeId);
    if (!node) return 0;
    if (node.type === 'device' && node.groupIds?.length === 0) return 0;

    let maxDepth = 0;
    if (node.type === 'device' && node.groupIds) {
      for (const pid of node.groupIds) {
        const d = 1 + get().actions.getDepth(pid, allNodes);
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
        get().actions.getDepth(b.id, currentNodes) -
        get().actions.getDepth(a.id, currentNodes),
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
});
