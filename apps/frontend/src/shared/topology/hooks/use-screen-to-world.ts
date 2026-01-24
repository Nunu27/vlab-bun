import { useCallback, type RefObject } from 'react';
import { useTopologyStore } from '../stores';

interface UseScreenToWorldProps {
  canvasRef: RefObject<HTMLDivElement | null>;
}

export const useScreenToWorld = ({ canvasRef }: UseScreenToWorldProps) => {
  const store = useTopologyStore();
  const view = store.use.view();

  return useCallback(
    (e: { clientX: number; clientY: number }) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (e.clientX - rect.left - view.x) / view.scale,
        y: (e.clientY - rect.top - view.y) / view.scale,
      };
    },
    [canvasRef, view],
  );
};
