import { ActionButton } from "@web/components/buttons/action-button";
import { Separator } from "@web/components/ui/separator";
import { MaximizeIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { useTopologyStore } from "../stores";

interface ControlsProps {
	canvasRef: React.RefObject<HTMLDivElement | null>;
}

function Controls({ canvasRef }: ControlsProps) {
	const store = useTopologyStore();

	const scale = store.use.view((view) => view.scale);
	const { recenter, zoomIn, zoomOut } = store.use.actions();

	return (
		<div className="absolute right-6 bottom-6 z-50 flex flex-col gap-2">
			<div className="flex flex-col gap-1 rounded-xl border border-border bg-card/90 p-1.5 shadow-lg backdrop-blur-sm">
				<ActionButton
					icon={MaximizeIcon}
					tooltip="Fit to Screen"
					variant="ghost"
					onClick={() => {
						const rect = canvasRef.current?.getBoundingClientRect();
						if (rect) recenter(rect);
					}}
				/>

				<Separator />

				<ActionButton
					icon={ZoomInIcon}
					tooltip="Zoom In"
					variant="ghost"
					onClick={() => {
						const rect = canvasRef.current?.getBoundingClientRect();
						if (rect) zoomIn(rect);
					}}
				/>
				<ActionButton
					icon={ZoomOutIcon}
					tooltip="Zoom Out"
					variant="ghost"
					onClick={() => {
						const rect = canvasRef.current?.getBoundingClientRect();
						if (rect) zoomOut(rect);
					}}
				/>
			</div>
			<div className="pointer-events-none flex w-12 items-center justify-center rounded-xl border border-border bg-card/90 px-3 py-1 font-medium text-[10px] text-muted-foreground shadow-sm backdrop-blur-sm">
				{Math.round(scale * 100)}%
			</div>
		</div>
	);
}

export default Controls;
