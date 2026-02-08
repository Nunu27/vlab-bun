import { useEventListener } from "@web/hooks/state/use-event-listener";
import type { RefObject } from "react";
import { useTopologyStore } from "../../stores";
import type { ScreenToWorld } from "./use-screen-to-world";

interface UseTopologyDropProps {
	enabled: boolean;
	elementRef: RefObject<HTMLDivElement>;
	screenToWorld: ScreenToWorld;
}

export const useTopologyDrop = ({
	enabled,
	elementRef,
	screenToWorld,
}: UseTopologyDropProps) => {
	const store = useTopologyStore();
	const { addDevice } = store.use.actions();

	const handleDrop = (e: DragEvent) => {
		const deviceId = e.dataTransfer?.getData("deviceId");
		if (!deviceId) return;

		e.preventDefault();
		addDevice(deviceId, screenToWorld({ x: e.clientX, y: e.clientY }));
	};

	useEventListener("drop", handleDrop, elementRef, { enabled, passive: false });
};
