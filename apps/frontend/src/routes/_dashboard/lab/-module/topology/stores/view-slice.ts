import type { StateCreator } from 'zustand';
import type { TopologyStore, ViewActions } from './types';

export const createViewSlice: StateCreator<
  TopologyStore,
  [['zustand/immer', never]],
  [],
  ViewActions
> = (set, get) => ({
  setView: (view) =>
    set((state) => ({
      view: typeof view === 'function' ? view(state.view) : view,
    })),

  zoomTo: (newScale, pivotScreen) => {
    const { view } = get();

    const wx = (pivotScreen.x - view.x) / view.scale;
    const wy = (pivotScreen.y - view.y) / view.scale;

    set({
      view: {
        scale: newScale,
        x: pivotScreen.x - wx * newScale,
        y: pivotScreen.y - wy * newScale,
      },
    });
  },

  recenter: (rect) => {
    const { nodes } = get();

    if (!nodes.length) {
      return set({ view: { x: 0, y: 0, scale: 1 } });
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    nodes.forEach((node) => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });

    const padding = 100;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    const scaleX = rect.width / contentWidth;
    const scaleY = rect.height / contentHeight;
    const newScale = Math.min(Math.min(scaleX, scaleY), 1);

    const contentCenterX = minX - padding + contentWidth / 2;
    const contentCenterY = minY - padding + contentHeight / 2;

    const viewportCenterX = rect.width / 2;
    const viewportCenterY = rect.height / 2;

    const newX = viewportCenterX - contentCenterX * newScale;
    const newY = viewportCenterY - contentCenterY * newScale;

    set({ view: { x: newX, y: newY, scale: newScale } });
  },

  zoomIn: (rect) => {
    const { view, actions } = get();
    const center = { x: rect.width / 2, y: rect.height / 2 };

    actions.zoomTo(Math.min(view.scale * 1.2, 4), center);
  },

  zoomOut: (rect) => {
    const { view, actions } = get();
    const center = { x: rect.width / 2, y: rect.height / 2 };

    actions.zoomTo(Math.max(view.scale / 1.2, 0.1), center);
  },
});
