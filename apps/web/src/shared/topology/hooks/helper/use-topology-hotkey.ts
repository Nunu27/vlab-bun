import { useHotkey } from "@tanstack/react-hotkeys";
import type { RefObject } from "react";
import { useTopologyStore } from "../../stores";

interface UseTopologyHotkeysProps {
	canvasRef: RefObject<HTMLDivElement>;
}

export const useTopologyHotkeys = ({ canvasRef }: UseTopologyHotkeysProps) => {
	const store = useTopologyStore();
	const {
		toggleMode,
		group,
		ungroup,
		delete: deleteSelected,
		zoomIn,
		zoomOut,
	} = store.use.actions();

	useHotkey("C", () => toggleMode("connect"));
	useHotkey("G", group);
	useHotkey("U", ungroup);
	useHotkey("T", () => toggleMode("note"));
	useHotkey("Delete", deleteSelected);
	useHotkey("Mod+=", () => {
		const rect = canvasRef.current?.getBoundingClientRect();
		if (rect) zoomIn(rect);
	});
	useHotkey("Mod+-", () => {
		const rect = canvasRef.current?.getBoundingClientRect();
		if (rect) zoomOut(rect);
	});
};
