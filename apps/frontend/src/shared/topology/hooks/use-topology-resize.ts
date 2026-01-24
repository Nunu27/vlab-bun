import { useCallback } from 'react';
import { useTopologyStore } from '../stores';

export const useTopologyResize = () => {
  const store = useTopologyStore();
  const resizeState = store.use.resizeState();
  const view = store.use.view();
  const nodes = store.use.nodes();
  const { setResizeState, setNodes } = store.use.actions();

  const startResize = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.type === 'device') return;

      setResizeState({
        nodeId,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: node.width,
        startHeight: node.height,
      });
    },
    [nodes, setResizeState],
  );

  const handleResizeMove = useCallback(
    (e: React.MouseEvent) => {
      if (!resizeState) return false;

      const dx = (e.clientX - resizeState.startX) / view.scale;
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id === resizeState.nodeId && n.type !== 'device') {
            return {
              ...n,
              width: Math.max(100, resizeState.startWidth + dx),
            };
          }
          return n;
        }),
      );

      return true;
    },
    [resizeState, view.scale, setNodes],
  );

  const handleResizeEnd = useCallback(() => {
    if (!resizeState) return false;
    setResizeState(null);
    return true;
  }, [resizeState, setResizeState]);

  return {
    resizeState,
    startResize,
    handleResizeMove,
    handleResizeEnd,
  };
};
