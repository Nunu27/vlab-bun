import { useCallback } from 'react';
import { useTopologyStore } from '../stores';

export const useTopologyEdgeInteraction = () => {
  const store = useTopologyStore();
  const connectMode = store.use.connectMode();
  const { setNodes, setEdges } = store.use.actions();

  const handleEdgeClick = useCallback(
    (e: React.MouseEvent, edgeId: string) => {
      if (connectMode) return;

      setNodes((ns) => ns.map((n) => ({ ...n, selected: false })));

      const isShift = e.shiftKey;
      setEdges((es) =>
        es.map((edge) => {
          if (edge.id === edgeId) {
            return { ...edge, selected: isShift ? !edge.selected : true };
          }
          return { ...edge, selected: isShift ? edge.selected : false };
        }),
      );
    },
    [connectMode, setNodes, setEdges],
  );

  return {
    handleEdgeClick,
  };
};
