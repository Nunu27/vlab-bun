import { useEventListener } from "@web/hooks/state/use-event-listener";
import { MouseButton, mouseButtonPressed } from "@web/lib/utils";
import type { RefObject } from "react";
import { MAX_ZOOM, MIN_ZOOM } from "../../constants";
import { useTopologyStore } from "../../stores";

interface UseTopologyWheelProps {
	elementRef: RefObject<HTMLDivElement>;
}

export const useTopologyWheel = ({ elementRef }: UseTopologyWheelProps) => {
	const store = useTopologyStore();
	const { setView, zoomTo } = store.use.actions();

	const onWheel = (e: WheelEvent) => {
		e.preventDefault();
		e.stopPropagation();

		// Do not pan/zoom when middle mouse button is pressed
		if (mouseButtonPressed(e.buttons, MouseButton.Wheel)) return;

		// Zoom when holding Ctrl / Cmd
		if (e.ctrlKey || e.metaKey) {
			const rect = elementRef.current?.getBoundingClientRect();
			if (!rect) return;

			const zoomSensitivity = 0.001;
			const delta = -e.deltaY * zoomSensitivity;
			const newScale = Math.min(
				Math.max(MIN_ZOOM, store.getState().view.scale + delta),
				MAX_ZOOM,
			);

			zoomTo(newScale, {
				x: e.clientX - rect.left,
				y: e.clientY - rect.top,
			});
		} else if (e.shiftKey) {
			// Pan horizontally when holding Shift
			setView((v) => ({ x: v.x - e.deltaY }));
		} else {
			// Pan all direction otherwise
			setView((v) => ({ x: v.x - e.deltaX, y: v.y - e.deltaY }));
		}
	};

	useEventListener("wheel", onWheel, elementRef, { passive: false });
};
