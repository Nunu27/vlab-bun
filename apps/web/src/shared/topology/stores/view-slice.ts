import type { StateCreator } from "zustand";
import {
	DEVICE_HEIGHT,
	DEVICE_WIDTH,
	MAX_ZOOM,
	MIN_ZOOM,
	ZOOM_STEP,
} from "../constants";
import type { Position, ViewState } from "../types";
import type { TopologyStore } from ".";

export type PanState = {
	start: Position;
	view: Position;
};

export interface TopologyViewState {
	view: ViewState;
	panState: PanState | null;
}

export const viewInitialState: TopologyViewState = {
	view: { scale: 1, x: 0, y: 0 },
	panState: null,
};

export interface TopologyViewActions {
	setView: (
		view: Partial<ViewState> | ((prev: ViewState) => Partial<ViewState>),
	) => void;

	setPanState: (start: Position | null) => boolean;
	onPan: (pos: Position) => boolean;

	recenter: (rect: DOMRect) => void;

	zoomIn: (rect: DOMRect) => void;
	zoomOut: (rect: DOMRect) => void;
	zoomTo: (newScale: number, pivotScreen: Position) => void;
}

export const createViewSlice: StateCreator<
	TopologyStore,
	[],
	[],
	TopologyViewActions
> = (set, get) => ({
	setView: (view) => {
		const currentView = get().view;
		const value = typeof view === "function" ? view(currentView) : view;
		set({ view: { ...currentView, ...value } });
	},

	setPanState: (start) => {
		const { view, panState } = get();
		if (!!panState === !!start) return false;

		set({ panState: start ? { start, view } : null });
		return true;
	},
	onPan: (pos) => {
		const { panState, actions } = get();
		if (!panState) return false;

		const { start, view } = panState;

		const dx = pos.x - start.x;
		const dy = pos.y - start.y;

		actions.setView({ x: view.x + dx, y: view.y + dy });
		return true;
	},

	recenter: (rect) => {
		const { devices } = get();

		if (!Object.keys(devices).length) {
			set({ view: { x: 0, y: 0, scale: 1 } });
			return;
		}

		// Calculate bounding box of all devices
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;

		Object.values(devices).forEach((device) => {
			if (!device) return;

			minX = Math.min(minX, device.x);
			minY = Math.min(minY, device.y);

			maxX = Math.max(maxX, device.x + DEVICE_WIDTH);
			maxY = Math.max(maxY, device.y + DEVICE_HEIGHT);
		});

		const padding = 100;
		const contentWidth = maxX - minX + padding * 2;
		const contentHeight = maxY - minY + padding * 2;

		const scaleX = rect.width / contentWidth;
		const scaleY = rect.height / contentHeight;
		const scale = Math.min(Math.min(scaleX, scaleY), 1);

		const contentCenterX = minX - padding + contentWidth / 2;
		const contentCenterY = minY - padding + contentHeight / 2;

		const viewportCenterX = rect.width / 2;
		const viewportCenterY = rect.height / 2;

		const x = viewportCenterX - contentCenterX * scale;
		const y = viewportCenterY - contentCenterY * scale;

		set({ view: { x, y, scale } });
	},

	zoomIn: (rect) => {
		const { view, actions } = get();
		const center = { x: rect.width / 2, y: rect.height / 2 };

		actions.zoomTo(Math.min(view.scale * ZOOM_STEP, MAX_ZOOM), center);
	},
	zoomTo: (scale, pivotScreen) => {
		const { view } = get();

		// Calculate world position of pivot point
		const wx = (pivotScreen.x - view.x) / view.scale;
		const wy = (pivotScreen.y - view.y) / view.scale;

		// Set new scale while keeping pivot point stationary
		set({
			view: {
				scale,
				x: pivotScreen.x - wx * scale,
				y: pivotScreen.y - wy * scale,
			},
		});
	},
	zoomOut: (rect) => {
		const { view, actions } = get();
		const center = { x: rect.width / 2, y: rect.height / 2 };

		actions.zoomTo(Math.max(view.scale / ZOOM_STEP, MIN_ZOOM), center);
	},
});
