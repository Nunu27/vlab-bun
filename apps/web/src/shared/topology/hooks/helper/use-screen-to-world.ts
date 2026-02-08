import type { RefObject } from "react";
import { useTopologyStore } from "../../stores";
import type { Position } from "../../types";

interface UseScreenToWorldProps {
	worldRef: RefObject<HTMLDivElement | null>;
}

export type ScreenToWorld = (pos: Position) => Position;

export const useScreenToWorld = ({
	worldRef,
}: UseScreenToWorldProps): ScreenToWorld => {
	const store = useTopologyStore();

	return (pos) => {
		const rect = worldRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };

		const { view } = store.getState();

		return {
			x: (pos.x - rect.left - view.x) / view.scale,
			y: (pos.y - rect.top - view.y) / view.scale,
		};
	};
};
