import { useEffect } from "react";
import { GRID_SIZE } from "../constants";
import { useTopologyStore } from "../stores";
import type { ViewState } from "../types";

interface BackgroundProps {
	ref: React.RefObject<HTMLDivElement>;
}

function Background({ ref }: BackgroundProps) {
	const store = useTopologyStore();

	useEffect(() => {
		const updateBackground = ({ scale, x, y }: ViewState) => {
			if (!ref.current) return;

			let multiplier = 1;

			if (scale < 0.3) {
				multiplier = 10;
			} else if (scale < 0.5) {
				multiplier = 6;
			} else if (scale < 0.75) {
				multiplier = 3;
			}
			// When zoomed in (scale > 1), keep grid spacing consistent
			else if (scale > 2) {
				multiplier = 0.5;
			} else if (scale > 1.5) {
				multiplier = 0.75;
			}

			const size = GRID_SIZE * multiplier * scale;
			const dotSize = Math.max(1, Math.min(2, 1 + (scale - 1) * 0.3));

			ref.current.style.backgroundImage = `radial-gradient(#4f46e5 ${dotSize}px, transparent ${dotSize}px)`;
			ref.current.style.backgroundSize = `${size}px ${size}px`;
			ref.current.style.backgroundPosition = `${x}px ${y}px`;
		};

		const { view } = store.getState();
		updateBackground(view);

		return store.subscribe((state) => state.view, updateBackground);
	}, [store, ref]);

	return (
		<div
			ref={ref}
			className="h-full w-full opacity-20"
			onDragOver={(e) => e.preventDefault()}
		/>
	);
}

export default Background;
