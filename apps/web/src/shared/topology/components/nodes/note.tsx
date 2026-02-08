import { cn } from "@web/lib/utils";
import { type RefObject, useRef } from "react";
import { useTopologyNodeInteraction } from "../../hooks/helper/use-topology-node-interaction";
import { useTopologyNoteInput } from "../../hooks/helper/use-topology-note-input";
import useTopologyNote from "../../hooks/store/use-topology-note";

function Note({ id }: { id: string }) {
	const { selected, state } = useTopologyNote(id);

	const ref = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;
	const textareaRef = useRef<HTMLTextAreaElement>(
		null,
	) as RefObject<HTMLTextAreaElement>;

	useTopologyNodeInteraction({
		identifier: { id, type: "note" },
		elementRef: ref,
	});

	useTopologyNoteInput({
		id,
		textareaRef,
	});

	if (!state) return null;

	return (
		<div
			ref={ref}
			className={cn(
				"node pointer-events-auto absolute rounded-lg border",
				selected
					? "border-dashed border-indigo-400"
					: "border-transparent bg-transparent",
			)}
			style={{
				left: state.x,
				top: state.y,
			}}
		>
			<textarea
				ref={textareaRef}
				value={state.content}
				className={
					"text-foreground font-sm block field-sizing-content w-full resize-none overflow-hidden bg-transparent p-2 font-sans leading-snug outline-none"
				}
				rows={1}
			/>
		</div>
	);
}

export default Note;
