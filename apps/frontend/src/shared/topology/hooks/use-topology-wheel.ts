import { useEffect, type RefObject } from 'react';
import { MAX_ZOOM, MIN_ZOOM } from '../constants';
import { useTopologyStore } from '../stores';

interface UseTopologyWheelProps {
  canvasRef: RefObject<HTMLDivElement | null>;
}

export const useTopologyWheel = ({ canvasRef }: UseTopologyWheelProps) => {
  const store = useTopologyStore();

  const view = store.use.view();
  const { setView, zoomTo } = store.use.actions();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        const rect = canvas.getBoundingClientRect();
        if (!rect) return;

        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(
          Math.max(MIN_ZOOM, view.scale + delta),
          MAX_ZOOM,
        );

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        zoomTo(newScale, { x: mouseX, y: mouseY });
      } else if (e.shiftKey) {
        setView((v) => ({ ...v, x: v.x - e.deltaY }));
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [canvasRef, setView, store, view.scale, zoomTo]);
};
