import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";
import Group from "../nodes/group";

function GroupLayer() {
	const store = useTopologyStore();
	const groups = store.use.groups(
		useShallow((groups) => Object.keys(groups).sort()),
	);

	return (
		<svg
			role="presentation"
			id="group-layer"
			className="pointer-events-none absolute overflow-visible"
		>
			{groups.map((id) => (
				<Group key={id} id={id} />
			))}
		</svg>
	);
}

export default GroupLayer;
