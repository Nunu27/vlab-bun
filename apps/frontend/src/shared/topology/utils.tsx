import { DynamicIcon } from '@frontend/components/dynamic-icon';
import { Settings } from 'lucide-react';
import { GRID_SIZE } from './constants';
import type { Position } from './types/node';
import type { ViewState } from './types/view';

/**
 * Get icon component for device
 */
export const getIcon = (name: string, className?: string) => {
  const props = { className: className || 'w-6 h-6' };
  return (
    <DynamicIcon
      name={name}
      {...props}
      fallback={
        <Settings {...props} className={props.className + ' opacity-50'} />
      }
    />
  );
};

/**
 * Snap value to grid
 */
export const snapToGrid = (val: number): number =>
  Math.round(val / GRID_SIZE) * GRID_SIZE;

/**
 * Calculate cross product for line intersection
 */
export const cross = (a: Position, b: Position, o: Position): number =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/**
 * Convert screen coordinates to canvas coordinates
 */
export const screenToCanvas = (
  screenPos: Position,
  viewState: ViewState,
): Position => ({
  x: (screenPos.x - viewState.x) / viewState.scale,
  y: (screenPos.y - viewState.y) / viewState.scale,
});

/**
 * Convert canvas coordinates to screen coordinates
 */
export const canvasToScreen = (
  canvasPos: Position,
  viewState: ViewState,
): Position => ({
  x: canvasPos.x * viewState.scale + viewState.x,
  y: canvasPos.y * viewState.scale + viewState.y,
});
