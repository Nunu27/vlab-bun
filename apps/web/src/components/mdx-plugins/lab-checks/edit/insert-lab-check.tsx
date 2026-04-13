import { ButtonWithTooltip, insertJsx$, usePublisher } from "@mdxeditor/editor";
import { ListCheckIcon } from "lucide-react";

export const InsertLabCheck = () => {
	const insertJsx = usePublisher(insertJsx$);

	return (
		<ButtonWithTooltip
			title="Insert Lab Checks"
			onClick={() =>
				insertJsx({
					name: "LabChecks",
					kind: "text",
					props: { value: "" },
				})
			}
		>
			<ListCheckIcon className="size-5" />
		</ButtonWithTooltip>
	);
};
