import { Button } from "@web/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@web/components/ui/dialog";
import { useModalState } from "@web/hooks/state/use-modal-state";
import { cn } from "@web/lib/utils";
import { Network } from "lucide-react";
import useTopologyConnectInterfaces from "../../hooks/store/use-topology-connect-interfaces";
import { useTopologyStore } from "../../stores";

function InterfaceSelectModal() {
	const store = useTopologyStore();
	const { cancelConnection, selectInterface } = store.use.actions();
	const { open, data } = useModalState(useTopologyConnectInterfaces());

	return (
		<Dialog open={open} onOpenChange={cancelConnection}>
			<DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
				<DialogHeader>
					<DialogTitle>Connect Device</DialogTitle>
					<DialogDescription>
						Select a network interface to connect.
					</DialogDescription>
				</DialogHeader>
				<div className="flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
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
			</DialogContent>
		</Dialog>
	);
}

export default InterfaceSelectModal;
