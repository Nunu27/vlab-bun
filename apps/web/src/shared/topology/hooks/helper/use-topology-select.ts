import { useEventListener } from "@web/hooks/state/use-event-listener";
import type { RefObject } from "react";
import { useTopologyStore } from "../../stores";
import type { ScreenToWorld } from "./use-screen-to-world";

interface UseTopologySelectProps {
	enabled: boolean;
	backgroundRef: RefObject<HTMLDivElement>;
	foregroundRef: RefObject<HTMLDivElement>;
	screenToWorld: ScreenToWorld;
}

export const useTopologySelect = ({
	enabled,
	backgroundRef,
	foregroundRef,
	screenToWorld,
}: UseTopologySelectProps) => {
	const store = useTopologyStore();
	const { setSelectState, onSelect } = store.use.actions();

	const reset = () => setSelectState(null);
	const handleMouseDown = (e: MouseEvent) => {
		if (e.button) return;

		e.preventDefault();
		e.stopPropagation();
		setSelectState(screenToWorld({ x: e.clientX, y: e.clientY }));
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (onSelect(screenToWorld({ x: e.clientX, y: e.clientY }))) {
			e.preventDefault();
			e.stopPropagation();
		}
	};

	const handleMouseUp = (e: MouseEvent) => {
		if (!e.button) {
			e.preventDefault();
			reset();
		}
	};

	useEventListener("mousedown", handleMouseDown, backgroundRef, {
		enabled,
		passive: false,
	});
	useEventListener("mousemove", handleMouseMove, foregroundRef, {
		enabled,
		passive: false,
	});
	useEventListener("mouseup", handleMouseUp, foregroundRef, {
		enabled,
		passive: false,
	});
	useEventListener("mouseleave", reset, foregroundRef, { enabled });
};
