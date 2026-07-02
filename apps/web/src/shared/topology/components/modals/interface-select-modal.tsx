import { Button } from "@web/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@web/components/ui/dialog";
import { ScrollArea } from "@web/components/ui/scroll-area";
import { useModalState } from "@web/hooks/state/use-modal-state";
import { cn } from "@web/lib/utils";
import { Network } from "lucide-react";
import { useShallow } from "zustand/shallow";
import useTopologyConnectInterfaces from "../../hooks/store/use-topology-connect-interfaces";
import { useTopologyStore } from "../../stores";

function InterfaceSelectModal() {
	const store = useTopologyStore();
	const { cancelConnection, selectInterface } = store.use.actions();
	const { open, data } = useModalState(useTopologyConnectInterfaces());

	const { targetName, sourceName, sourceInterface } = store(
		useShallow(({ connectDeviceId, connectSource, devices }) => ({
			targetName: connectDeviceId
				? (devices[connectDeviceId]?.name ?? null)
				: null,
			sourceName: connectSource
				? (devices[connectSource.deviceId]?.name ?? null)
				: null,
			sourceInterface: connectSource?.interface ?? null,
		})),
	);

	const isPickingTarget = sourceName !== null;

	return (
		<Dialog open={open} onOpenChange={() => cancelConnection()}>
			<DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
				<DialogHeader>
					<DialogTitle>
						{isPickingTarget
							? "Complete Connection (2/2)"
							: "Start Connection (1/2)"}
					</DialogTitle>
					<DialogDescription>
						{isPickingTarget ? (
							<>
								From{" "}
								<span className="font-medium text-foreground">
									{sourceName}
								</span>{" "}
								[<span className="font-mono text-xs">{sourceInterface}</span>]:
								select an interface on{" "}
								<span className="font-medium text-foreground">
									{targetName}
								</span>
							</>
						) : (
							<>
								Select an interface on{" "}
								<span className="font-medium text-foreground">
									{targetName}
								</span>
							</>
						)}
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="-mx-6 max-h-80 px-6">
					<div className="flex flex-col gap-1">
						{data?.interfaces.map((iface) => {
							const disabled = !iface.configurable || data.used.has(iface.name);

							return (
								<Button
									key={iface.name}
									variant="ghost"
									disabled={disabled}
									onClick={() => selectInterface(iface.name)}
									className={cn(
										"h-auto w-full justify-between px-4 py-3",
										disabled && "opacity-50",
									)}
								>
									<div className="flex items-center gap-3">
										<Network
											size={16}
											className={
												disabled ? "text-muted-foreground" : "text-primary"
											}
										/>
										<span className="font-medium">{iface.name}</span>
									</div>
								</Button>
							);
						})}
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}

export default InterfaceSelectModal;
