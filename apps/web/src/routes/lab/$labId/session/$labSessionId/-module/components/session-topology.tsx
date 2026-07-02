import { ActionButton } from "@web/components/buttons/action-button";
import { Badge } from "@web/components/ui/badge";
import { useWSConnectionState } from "@web/hooks/ws";
import TopologyCanvas from "@web/shared/topology/components/canvas";
import { BookOpen, WifiOff } from "lucide-react";
import { useLabSessionModalStore } from "../store/lab-session-modal-store";

export function SessionTopology({
	onReplayTour,
}: {
	onReplayTour?: () => void;
}) {
	const store = useLabSessionModalStore();
	const { sidebar } = store.use.actions();
	const isConnected = useWSConnectionState();

	return (
		<>
			<TopologyCanvas onReplayTour={onReplayTour} />

			{!isConnected && (
				<div className="absolute top-6 left-6 z-50">
					<Badge variant="destructive" className="gap-1.5 shadow-lg">
						<WifiOff className="size-3.5" />
						Disconnected
					</Badge>
				</div>
			)}

			<div
				data-tour="toggle-instructions"
				className="absolute top-6 right-6 z-50"
			>
				<div className="flex flex-col gap-1 rounded-xl border border-border bg-card/90 p-1.5 shadow-lg backdrop-blur-sm">
					<ActionButton
						icon={BookOpen}
						tooltip="Toggle Instructions"
						variant="ghost"
						onClick={() => sidebar.toggle("open")}
					/>
				</div>
			</div>
		</>
	);
}
