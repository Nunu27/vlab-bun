import { useEventListener } from "@web/hooks/state/use-event-listener";
import type { RefObject } from "react";
import { useTopologyStore } from "../../stores";
import type { NodeIdentifier } from "../../stores/node-slice";

interface UseTopologyNodeInteractionProps<T> {
	identifier: NodeIdentifier;
	elementRef: RefObject<T>;
}

export const useTopologyNodeInteraction = <T extends Element>({
	identifier,
	elementRef,
}: UseTopologyNodeInteractionProps<T>) => {
	const store = useTopologyStore();
	const isEditor = store.use.isEditor();
	const { setDragState, onDrag, connectDevice, setEditingNoteId } =
		store.use.actions();

	const handleMouseDown = (e: MouseEvent) => {
		if (!e.button) setDragState({ x: e.clientX, y: e.clientY }, identifier);
	};

	const handleMouseMove = (e: MouseEvent) => {
		onDrag({ x: e.clientX, y: e.clientY });
	};

	const handleMouseUp = (e: MouseEvent) => {
		if (!e.button) setDragState(null);
	};

	const handleClick = () => {
		connectDevice(identifier.id);
	};

	const dblClickHandler: Partial<Record<NodeIdentifier["type"], () => void>> = {
		note: () => setEditingNoteId(identifier.id),
		device: () => {
			const { sessionId, nodesData } = store.getState();
			const node = nodesData?.[identifier.id];

			if (!sessionId || !node) return;

			const width = 1024;
			const height = 768;
			const left = (window.screen.width - width) / 2;
			const top = (window.screen.height - height) / 2;

			const url = `${window.location.pathname}/node/${node.id}`;
			const name = `vlab-session-${node.id}`;
			const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,location=no,toolbar=no,menubar=no`;

			const win = window.open("", name, features);
			if (win) {
				if (win.location.pathname !== url) {
					win.location.href = url;
				}

				win.focus();
			}
		},
	};

	const handleDoubleClick = () => {
		const handler = dblClickHandler[identifier.type];
		if (handler) handler();
	};

	useEventListener("mousedown", handleMouseDown, elementRef, {
		enabled: isEditor,
	});
	useEventListener("mousemove", handleMouseMove, elementRef, {
		enabled: isEditor,
	});
	useEventListener("mouseup", handleMouseUp, elementRef, {
		enabled: isEditor,
	});
	useEventListener("click", handleClick, elementRef, {
		enabled: isEditor && identifier.type === "device",
	});
	useEventListener("dblclick", handleDoubleClick, elementRef, {
		enabled: identifier.type in dblClickHandler,
	});
};
