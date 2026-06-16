import { useHotkey } from "@tanstack/react-hotkeys";
import type { RefObject } from "react";
import { useTopologyStore } from "../../stores";

interface UseTopologyHotkeysProps {
	canvasRef: RefObject<HTMLDivElement>;
}

export const useTopologyHotkeys = ({ canvasRef }: UseTopologyHotkeysProps) => {
	const store = useTopologyStore();
	const isEditor = store.use.isEditor();
	const {
		toggleMode,
		group,
		ungroup,
		delete: deleteSelected,
		zoomIn,
		zoomOut,
	} = store.use.actions();

	useHotkey("C", () => toggleMode("connect"), { enabled: isEditor });
	useHotkey("G", group, { enabled: isEditor });
	useHotkey("U", ungroup, { enabled: isEditor });
	useHotkey("T", () => toggleMode("note"), { enabled: isEditor });
	useHotkey("Delete", deleteSelected, { enabled: isEditor });
	useHotkey("Mod+=", () => {
		const rect = canvasRef.current?.getBoundingClientRect();
		if (rect) zoomIn(rect);
	});
	useHotkey("Mod+-", () => {
		const rect = canvasRef.current?.getBoundingClientRect();
		if (rect) zoomOut(rect);
	});
};
