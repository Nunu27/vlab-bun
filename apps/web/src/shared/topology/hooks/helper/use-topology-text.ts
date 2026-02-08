import { useEventListener } from "@web/hooks/state/use-event-listener";
import type { RefObject } from "react";
import { useTopologyStore } from "../../stores";
import type { ScreenToWorld } from "./use-screen-to-world";

interface UseTopologyTextProps {
	enabled: boolean;
	elementRef: RefObject<HTMLDivElement>;
	screenToWorld: ScreenToWorld;
}

export const useTopologyText = ({
	enabled,
	elementRef,
	screenToWorld,
}: UseTopologyTextProps) => {
	const store = useTopologyStore();
	const { addNote } = store.use.actions();

	const handleClick = (e: MouseEvent) => {
		e.preventDefault();
		addNote(screenToWorld({ x: e.clientX, y: e.clientY }));
	};

	useEventListener("click", handleClick, elementRef, {
		enabled,
		passive: false,
	});
};
