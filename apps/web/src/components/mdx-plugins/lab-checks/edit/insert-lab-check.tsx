import { ButtonWithTooltip, insertJsx$, usePublisher } from "@mdxeditor/editor";
import { useHotkey } from "@tanstack/react-hotkeys";
import { ListCheckIcon } from "lucide-react";

export const InsertLabCheck = () => {
	const insertJsx = usePublisher(insertJsx$);

	const handleInsert = () => {
		insertJsx({
			name: "LabChecks",
			kind: "text",
			props: { value: "" },
		});
	};

	useHotkey("Mod+L", handleInsert);

	return (
		<ButtonWithTooltip
			data-tour="insert-lab-check"
			title="Insert Lab Checks (⌘L/Ctrl+L)"
			onClick={handleInsert}
		>
			<ListCheckIcon className="size-5" />
		</ButtonWithTooltip>
	);
};
