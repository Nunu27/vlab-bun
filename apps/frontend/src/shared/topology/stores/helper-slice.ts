import type { StateCreator } from 'zustand';
import {
  GROUP_PADDING,
  DEFAULT_DEVICE_WIDTH,
  DEFAULT_DEVICE_HEIGHT,
} from '../constants';
import type { TopologyStore, HelperActions } from './types';

/**
 * Helper utilities slice
 * Provides utility functions for node tree operations
 */
export const createHelperSlice: StateCreator<
  TopologyStore,
  [],
  [],
  HelperActions
> = (_, get) => ({
  /**
   * Calculate nesting depth of a node (how many groups it's inside)
   */
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

  /**
   * Recalculate group bounds to fit their children
   */
  recalculateGroupBounds: (currentNodes) => {
    const nodeMap = new Map(currentNodes.map((n) => [n.id, n]));
    const groups = currentNodes.filter((n) => n.type === 'group');

    // Sort groups by depth (deepest first) to handle nested groups
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
          const width =
            currentMember.type === 'device'
              ? DEFAULT_DEVICE_WIDTH
              : 'width' in currentMember
                ? currentMember.width
                : 0;
          const height =
            currentMember.type === 'device'
              ? DEFAULT_DEVICE_HEIGHT
              : 'height' in currentMember
                ? currentMember.height
                : 0;

          minX = Math.min(minX, currentMember.x);
          minY = Math.min(minY, currentMember.y);
          maxX = Math.max(maxX, currentMember.x + width);
          maxY = Math.max(maxY, currentMember.y + height);
        });

        const HEADER_HEIGHT = 20;

        const newGroup = {
          ...nodeMap.get(group.id)!,
          x: minX - GROUP_PADDING,
          y: minY - GROUP_PADDING - HEADER_HEIGHT,
          width: maxX - minX + GROUP_PADDING * 2,
          height: maxY - minY + (GROUP_PADDING + HEADER_HEIGHT) * 2,
        };
        nodeMap.set(group.id, newGroup);
      } else {
        // Remove empty groups
        groupsToRemove.add(group.id);
      }
    });

    return Array.from(nodeMap.values()).filter(
      (n) => !groupsToRemove.has(n.id),
    );
  },

  /**
   * Move a node and all its children (for groups)
   */
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

      // If this is a group, add its children to queue
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
