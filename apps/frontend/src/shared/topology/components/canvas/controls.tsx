import { ActionButton } from '@frontend/components/action-button';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { memo } from 'react';
import { useTopologyStore } from '../../stores';

interface ControlsProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export const ControlsComponent = memo(({ canvasRef }: ControlsProps) => {
  const store = useTopologyStore();
  const view = store.use.view();
  const { recenter, zoomIn, zoomOut } = store.use.actions();

  return (
    <div
      className="absolute right-6 bottom-6 z-50 flex flex-col gap-2"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="border-border bg-card/90 flex flex-col gap-1 rounded-xl border p-1.5 shadow-lg backdrop-blur-sm">
        <ActionButton
          icon={Maximize}
          tooltip="Fit to Screen"
          variant="ghost"
          onClick={() => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) recenter(rect);
          }}
        />
        <div className="bg-border h-px w-full" />
        <ActionButton
          icon={ZoomIn}
          tooltip="Zoom In"
          variant="ghost"
          onClick={() => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) zoomIn(rect);
          }}
        />
        <ActionButton
          icon={ZoomOut}
          tooltip="Zoom Out"
          variant="ghost"
          onClick={() => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) zoomOut(rect);
          }}
        />
      </div>
      <div className="border-border bg-card/90 text-muted-foreground pointer-events-none rounded-lg border px-3 py-1 text-center text-[10px] font-medium shadow-sm backdrop-blur-sm">
        {Math.round(view.scale * 100)}%
      </div>
    </div>
  );
});
