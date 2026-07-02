import { useEventListener } from "@web/hooks/state/use-event-listener";
import { MouseButton } from "@web/lib/utils";
import type { RefObject } from "react";
import { useTopologyStore } from "../../stores";

interface UseTopologyPanAndDragProps {
	backgroundRef: RefObject<HTMLDivElement>;
	foregroundRef: RefObject<HTMLDivElement>;
	panOnLeftClick?: boolean;
}

export const useTopologyPanAndDrag = ({
	backgroundRef,
	foregroundRef,
	panOnLeftClick,
}: UseTopologyPanAndDragProps) => {
	const store = useTopologyStore();
	const { setPanState, onPan, setDragState, onDrag } = store.use.actions();

	const reset = () => {
		if (setPanState(null)) {
			backgroundRef.current.style.cursor = "";
		} else setDragState(null);
	};

	const handleMouseDown = (e: MouseEvent) => {
		const isPanButton =
			e.button === MouseButton.Wheel ||
			(panOnLeftClick && e.button === MouseButton.Left);

		if (isPanButton && setPanState({ x: e.clientX, y: e.clientY })) {
			e.preventDefault();
			e.stopPropagation();
			backgroundRef.current.style.cursor = "grabbing";
		}
	};

	const handleMouseMove = (e: MouseEvent) => {
		const pos = { x: e.clientX, y: e.clientY };

		if (onPan(pos)) {
			e.preventDefault();
			e.stopPropagation();
		} else onDrag(pos);
	};

	const handleMouseUp = (e: MouseEvent) => {
		if (e.button === MouseButton.Left || e.button === MouseButton.Wheel) {
			e.preventDefault();
			e.stopPropagation();
			reset();
		}
	};

	useEventListener("mousedown", handleMouseDown, backgroundRef, {
		passive: false,
	});
	useEventListener("mousemove", handleMouseMove, foregroundRef, {
		passive: false,
	});
	useEventListener("mouseup", handleMouseUp, foregroundRef, { passive: false });
	useEventListener("mouseleave", reset, foregroundRef);
};
