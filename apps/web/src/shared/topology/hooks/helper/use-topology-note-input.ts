import { useEventListener } from "@web/hooks/state/use-event-listener";
import { type RefObject, useEffect } from "react";
import { useTopologyStore } from "../../stores";

interface UseTopologyNoteInputProps {
	id: string;
	textareaRef: RefObject<HTMLTextAreaElement>;
}

export const useTopologyNoteInput = ({
	id,
	textareaRef,
}: UseTopologyNoteInputProps) => {
	const store = useTopologyStore();
	const { setEditingNoteId, updateNote } = store.use.actions();

	useEffect(() => {
		const applyEditingState = (isEditing: boolean) => {
			const textarea = textareaRef.current;
			if (!textarea) return;

			textarea.readOnly = !isEditing;
			textarea.style.cursor = isEditing ? "text" : "unset";
			textarea.style.userSelect = isEditing ? "text" : "none";

			if (isEditing) {
				requestAnimationFrame(() => {
					textarea.focus();
					const end = textarea.value.length;
					textarea.setSelectionRange(end, end);
				});
			} else {
				textarea.setSelectionRange(0, 0);
			}
		};

		applyEditingState(store.getState().editingNoteId === id);

		return store.subscribe(
			(state) => state.editingNoteId === id,
			(isEditing) => {
				applyEditingState(isEditing);
			},
		);
	}, [store, textareaRef, id]);

	const handleInput = (e: Event) => {
		if (!(e.target instanceof HTMLTextAreaElement)) return;

		updateNote(id, { content: e.target.value });
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			setEditingNoteId(null);
		}
	};

	useEventListener("keydown", handleKeyDown, textareaRef);
	useEventListener("input", handleInput, textareaRef);
};
