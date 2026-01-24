/**
 * Grid size for snapping nodes to grid
 */
export const GRID_SIZE = 20;

/**
 * Padding around grouped nodes
 */
export const GROUP_PADDING = 20;

/**
 * Available colors for groups
 */
export const GROUP_COLORS = [
  '#9ca3af', // Gray
  '#818cf8', // Indigo
  '#4ade80', // Green
  '#fb923c', // Orange
  '#f87171', // Red
  '#f472b6', // Pink
] as const;

/**
 * Default dimensions for new notes
 */
export const DEFAULT_NOTE_WIDTH = 200;
export const DEFAULT_NOTE_HEIGHT = 100;

/**
 * Default dimensions for device nodes
 */
export const DEFAULT_DEVICE_WIDTH = 80;
export const DEFAULT_DEVICE_HEIGHT = 80;

/**
 * Zoom limits
 */
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 1.2;
