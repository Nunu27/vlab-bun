import { useCallback } from 'react';
import { useTopologyStore } from '../stores';
import { snapToGrid } from '../utils';

interface UseTopologyDragOptions {
  screenToWorld: (e: { clientX: number; clientY: number }) => {
    x: number;
    y: number;
  };
}

export const useTopologyDrag = ({ screenToWorld }: UseTopologyDragOptions) => {
  const store = useTopologyStore();
  const isDraggingNode = store.use.isDraggingNode();
  const dragOffset = store.use.dragOffset();
  const nodes = store.use.nodes();
  const {
    setIsDraggingNode,
    setDragOffset,
    setNodes,
    moveNodeTree,
    recalculateGroupBounds,
  } = store.use.actions();

  const startDrag = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      setIsDraggingNode(nodeId);
      const worldPos = screenToWorld(e);
      setDragOffset({
        x: worldPos.x - node.x,
        y: worldPos.y - node.y,
      });
    },
    [nodes, screenToWorld, setIsDraggingNode, setDragOffset],
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingNode) return false;

      const worldPos = screenToWorld(e);
      const rawNx = worldPos.x - dragOffset.x;
      const rawNy = worldPos.y - dragOffset.y;

      setNodes((currentNodes) => {
        const draggingNode = currentNodes.find((n) => n.id === isDraggingNode);
        if (!draggingNode) return currentNodes;

        // Use direct movement (raw) during drag for smoothness
        const dx = rawNx - draggingNode.x;
        const dy = rawNy - draggingNode.y;

        let newNodes = [...currentNodes];

        if (draggingNode.selected) {
          const nodesToMove = newNodes.filter((n) => n.selected);
          newNodes = moveNodeTree(nodesToMove, dx, dy, newNodes);
        } else {
          newNodes = moveNodeTree([draggingNode], dx, dy, newNodes);
        }

        return recalculateGroupBounds(newNodes);
      });

      return true;
    },
    [
      isDraggingNode,
      dragOffset,
      screenToWorld,
      setNodes,
      moveNodeTree,
      recalculateGroupBounds,
    ],
  );

  const handleDragEnd = useCallback(() => {
    if (!isDraggingNode) return false;

    // Snap-on-Release Logic
    setNodes((ns) => {
      const snapped = ns.map((n) => {
        if (
          n.id === isDraggingNode ||
          (ns.find((x) => x.id === isDraggingNode)?.selected && n.selected)
        ) {
          return { ...n, x: snapToGrid(n.x), y: snapToGrid(n.y) };
        }
        return n;
      });
      return recalculateGroupBounds(snapped);
    });
    setIsDraggingNode(null);

    return true;
  }, [isDraggingNode, setNodes, setIsDraggingNode, recalculateGroupBounds]);

  return {
    isDraggingNode,
    startDrag,
    handleDragMove,
    handleDragEnd,
  };
};
