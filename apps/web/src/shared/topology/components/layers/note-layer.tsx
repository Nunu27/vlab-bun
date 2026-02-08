import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";
import Note from "../nodes/note";

function NoteLayer() {
	const store = useTopologyStore();
	const notes = store.use.notes(
		useShallow((notes) => Object.keys(notes).sort()),
	);

	return (
		<div
			id="note-layer"
			className="pointer-events-none absolute overflow-visible"
		>
			{notes.map((id) => (
				<Note key={id} id={id} />
			))}
		</div>
	);
}

export default NoteLayer;
