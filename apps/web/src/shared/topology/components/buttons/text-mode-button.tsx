import { ActionButton } from "@web/components/buttons/action-button";
import { TypeIcon } from "lucide-react";
import { useTopologyStore } from "../../stores";

function TextModeButton() {
	const store = useTopologyStore();
	const inNoteMode = store.use.mode((mode) => mode === "note");
	const { toggleMode } = store.use.actions();

	return (
		<ActionButton
			icon={TypeIcon}
			tooltip="Text [T]"
			variant={inNoteMode ? "default" : "ghost"}
			onClick={() => toggleMode("note")}
		/>
	);
}

export default TextModeButton;
