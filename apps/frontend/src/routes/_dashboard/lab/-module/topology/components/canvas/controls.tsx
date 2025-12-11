import { memo } from 'react';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useTopologyStore } from '../../hooks';

interface ControlsProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export const ControlsComponent = memo(({ canvasRef }: ControlsProps) => {
  const view = useTopologyStore((state) => state.view);
  const recenter = useTopologyStore((state) => state.recenter);
  const zoomIn = useTopologyStore((state) => state.zoomIn);
  const zoomOut = useTopologyStore((state) => state.zoomOut);

  return (
    <div
      className="absolute right-6 bottom-6 z-50 flex flex-col gap-2"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="border-border bg-card/90 flex flex-col gap-1 rounded-xl border p-1.5 shadow-lg backdrop-blur-sm">
        <button
          onClick={() => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) recenter(rect);
          }}
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg p-2 transition-colors"
          title="Fit to Screen"
        >
          <Maximize size={20} />
        </button>
        <div className="bg-border h-px w-full" />
        <button
          onClick={() => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) zoomIn(rect);
          }}
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg p-2 transition-colors"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={() => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) zoomOut(rect);
          }}
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg p-2 transition-colors"
        >
          <ZoomOut size={20} />
        </button>
      </div>
      <div className="border-border bg-card/90 text-muted-foreground pointer-events-none rounded-lg border px-3 py-1 text-center text-[10px] font-medium shadow-sm backdrop-blur-sm">
        {Math.round(view.scale * 100)}%
      </div>
    </div>
  );
});
