import { memo, useMemo } from 'react';
import { useTopologyStore } from '../../stores';
import { GRID_SIZE } from '../../constants';

export const BackgroundComponent = memo(() => {
  const store = useTopologyStore();
  const view = store.use.view();

  // Calculate adaptive grid size and opacity based on zoom level
  const { gridSize, dotSize, opacity } = useMemo(() => {
    const scale = view.scale;

    // Base grid size
    const size = GRID_SIZE;
    let multiplier = 1;

    // When zoomed out (scale < 1), increase grid spacing significantly
    if (scale < 0.3) {
      multiplier = 10;
    } else if (scale < 0.5) {
      multiplier = 6;
    } else if (scale < 0.75) {
      multiplier = 3;
    }
    // When zoomed in (scale > 1), keep grid spacing consistent
    else if (scale > 2) {
      multiplier = 0.5;
    } else if (scale > 1.5) {
      multiplier = 0.75;
    }

    const finalSize = size * multiplier * scale;

    // Adjust dot size - grow slightly with zoom but not linearly
    const dotSize = Math.max(1, Math.min(2, 1 + (scale - 1) * 0.3));

    // Fade out when too dense or too sparse
    let opacity = 0.25;
    if (finalSize < 8)
      opacity = 0.1; // Too dense
    else if (finalSize > 50)
      opacity = Math.max(0.1, 0.25 - (finalSize - 50) * 0.003); // Gradually fade

    return { gridSize: finalSize, dotSize, opacity };
  }, [view.scale]);

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `radial-gradient(#4f46e5 ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
        opacity,
        transition: 'opacity 0.1s ease-out',
      }}
    />
  );
});
