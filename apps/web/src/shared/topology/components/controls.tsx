import { ActionButton } from "@web/components/buttons/action-button";
import { Button } from "@web/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@web/components/ui/popover";
import { Separator } from "@web/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@web/components/ui/tooltip";
import {
	KeyboardIcon,
	MaximizeIcon,
	RotateCcwIcon,
	ZoomInIcon,
	ZoomOutIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTopologyStore } from "../stores";

interface ControlsProps {
	canvasRef: React.RefObject<HTMLDivElement | null>;
	onReplayTour?: () => void;
}

function Kbd({ children }: { children: ReactNode }) {
	return (
		<kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-medium font-mono text-[10px] text-muted-foreground">
			{children}
		</kbd>
	);
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
	return (
		<div className="flex items-center justify-between gap-6">
			<span className="text-foreground text-xs">{label}</span>
			<div className="flex shrink-0 items-center gap-0.5">
				{keys.map((key, i) => (
					<span key={i} className="flex items-center gap-0.5">
						{i > 0 && (
							<span className="px-0.5 text-[10px] text-muted-foreground/50">
								+
							</span>
						)}
						<Kbd>{key}</Kbd>
					</span>
				))}
			</div>
		</div>
	);
}

function Controls({ canvasRef, onReplayTour }: ControlsProps) {
	const store = useTopologyStore();
	const scale = store.use.view((view) => view.scale);
	const isEditor = store.use.isEditor();
	const { recenter, zoomIn, zoomOut } = store.use.actions();

	const mod = navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl";
	const [shortcutsOpen, setShortcutsOpen] = useState(false);

	return (
		<div className="absolute right-6 bottom-6 z-50 flex flex-col gap-2">
			<div
				data-tour="canvas-controls"
				className="flex flex-col gap-1 rounded-xl border border-border bg-card/90 p-1.5 shadow-lg backdrop-blur-sm"
			>
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

				<Separator />

				<Popover open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
					<Tooltip delayDuration={250}>
						<TooltipTrigger asChild>
							<PopoverTrigger asChild>
								<Button variant="ghost" size="icon" className="transition-none">
									<KeyboardIcon className="size-4" />
									<span className="sr-only">Keyboard Shortcuts</span>
								</Button>
							</PopoverTrigger>
						</TooltipTrigger>
						<TooltipContent side="left">Keyboard Shortcuts</TooltipContent>
					</Tooltip>
					<PopoverContent side="left" align="end" className="w-52 p-3">
						<div className="flex flex-col gap-3">
							<span className="font-semibold text-xs">Keyboard Shortcuts</span>
							<div className="flex flex-col gap-1.5">
								<span className="font-medium text-[10px] text-muted-foreground/70 uppercase tracking-wider">
									Navigation
								</span>
								<ShortcutRow label="Zoom In" keys={[mod, "="]} />
								<ShortcutRow label="Zoom Out" keys={[mod, "-"]} />
								<ShortcutRow label="Zoom In / Out" keys={[mod, "Scroll"]} />
								<ShortcutRow label="Pan Vertically" keys={["Scroll"]} />
								<span className="text-[9px] text-muted-foreground/50">
									Alt + Scroll also works
								</span>
								<ShortcutRow
									label="Pan Horizontally"
									keys={["Shift", "Scroll"]}
								/>
							</div>
							{onReplayTour && (
								<>
									<Separator />
									<div className="flex flex-col gap-1.5">
										<span className="font-medium text-[10px] text-muted-foreground/70 uppercase tracking-wider">
											Help
										</span>
										<Button
											variant="ghost"
											size="sm"
											className="h-7 justify-start gap-2 px-1.5 font-normal text-xs"
											onClick={() => {
												setShortcutsOpen(false);
												onReplayTour();
											}}
										>
											<RotateCcwIcon className="size-3.5" />
											Replay Tour
										</Button>
									</div>
								</>
							)}
							{isEditor && (
								<>
									<Separator />
									<div className="flex flex-col gap-1.5">
										<span className="font-medium text-[10px] text-muted-foreground/70 uppercase tracking-wider">
											Editor
										</span>
										<ShortcutRow label="Connect Mode" keys={["C"]} />
										<ShortcutRow label="Text Note" keys={["T"]} />
										<ShortcutRow label="Group" keys={["G"]} />
										<ShortcutRow label="Ungroup" keys={["U"]} />
										<ShortcutRow label="Delete" keys={["Del"]} />
									</div>
								</>
							)}
						</div>
					</PopoverContent>
				</Popover>
			</div>
			<div className="pointer-events-none flex w-12 items-center justify-center rounded-xl border border-border bg-card/90 px-3 py-1 font-medium text-[10px] text-muted-foreground shadow-sm backdrop-blur-sm">
				{Math.round(scale * 100)}%
			</div>
		</div>
	);
}

export default Controls;
