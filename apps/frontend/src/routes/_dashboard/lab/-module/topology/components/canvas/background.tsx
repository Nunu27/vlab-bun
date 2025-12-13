import { memo } from 'react';
import { useTopologyStore } from '../../hooks';

export const BackgroundComponent = memo(() => {
  const view = useTopologyStore((state) => state.view);

  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-25"
      style={{
        backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)',
        backgroundSize: `${20 * view.scale}px ${20 * view.scale}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
    />
  );
});
