import { useMemo } from 'react';
import { useTopologyStore } from '../stores';
import type { GroupNodeData } from '../types';

interface UseTopologyDataOptions {
  includeDepthSort?: boolean;
}

export const useTopologyData = (options: UseTopologyDataOptions = {}) => {
  const { includeDepthSort = false } = options;
  const store = useTopologyStore();
  const nodes = store.use.nodes();
  const { getDepth } = store.use.actions();

  const sortedGroups = useMemo(() => {
    const groups = nodes.filter((n): n is GroupNodeData => n.type === 'group');

    if (includeDepthSort) {
      return groups.sort((a, b) => {
        const depthA = getDepth(a.id, nodes);
        const depthB = getDepth(b.id, nodes);
        return depthA - depthB;
      });
    } else {
      return groups.sort((a, b) => {
        const areaA = (a.width || 0) * (a.height || 0);
        const areaB = (b.width || 0) * (b.height || 0);
        return areaB - areaA;
      });
    }
  }, [nodes, getDepth, includeDepthSort]);

  const devices = useMemo(
    () => nodes.filter((n) => n.type === 'device' || n.type === 'note'),
    [nodes],
  );

  const duplicateNodeIds = useMemo(() => {
    const counts = new Map<string, number>();
    nodes.forEach((n) => {
      if (n.type === 'note') return;
      const name = n.type === 'device' || n.type === 'group' ? n.name : '';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return new Set(
      nodes
        .filter((n) => n.type === 'device' && (counts.get(n.name) || 0) > 1)
        .map((n) => n.id),
    );
  }, [nodes]);

  return {
    sortedGroups,
    devices,
    duplicateNodeIds,
  };
};
