import { memo } from 'react';
import { useTopologyStore } from '../../hook';

export const BackgroundComponent = memo(() => {
  const store = useTopologyStore();
  const view = store.use.view();

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
