import { useTopologyStore } from "../stores";

function ConnectionStatus() {
	const store = useTopologyStore();
	const mode = store.use.mode();
	const connectSource = store.use.connectSource();

	if (mode !== "connect") return null;

	return (
		<div className="pointer-events-none absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
			{connectSource ? (
				<>
					<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
					<span>Click a target device to connect</span>
				</>
			) : (
				<span>Click a device to start a connection</span>
			)}
		</div>
	);
}

export default ConnectionStatus;
