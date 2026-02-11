import { useTopologyStore } from "../../stores";

function SelectionLayer() {
	const store = useTopologyStore();
	const state = store.use.selectState((state) => {
		if (state?.start === state?.current) return null;
		else return state;
	});

	if (!state) return null;

	return (
		<svg
			role="presentation"
			id="selection-layer"
			className="pointer-events-none absolute overflow-visible"
		>
			<rect
				x={Math.min(state.start.x, state.current.x)}
				y={Math.min(state.start.y, state.current.y)}
				width={Math.abs(state.current.x - state.start.x)}
				height={Math.abs(state.current.y - state.start.y)}
				className="fill-primary/20 stroke-1 stroke-primary"
			/>
		</svg>
	);
}

export default SelectionLayer;
