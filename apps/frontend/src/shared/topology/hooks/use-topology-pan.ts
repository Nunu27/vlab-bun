import { useCallback } from 'react';
import { useTopologyStore } from '../stores';

export const useTopologyPan = () => {
  const store = useTopologyStore();
  const isPanning = store.use.isPanning();
  const lastMousePos = store.use.lastMousePos();
  const { setIsPanning, setLastMousePos, setView } = store.use.actions();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    },
    [setIsPanning, setLastMousePos],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;
        setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
        setLastMousePos({ x: e.clientX, y: e.clientY });
      }
    },
    [isPanning, lastMousePos, setView, setLastMousePos],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, [setIsPanning]);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, [setIsPanning]);

  return {
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  };
};
