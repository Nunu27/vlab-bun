import type { Position } from './node';

/**
 * Selection box for multi-select
 */
export interface SelectionBox {
  start: Position;
  current: Position;
}

/**
 * Resize operation state
 */
export interface ResizeState {
  nodeId: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

/**
 * Connection mode source
 */
export interface ConnectionSource {
  nodeId: string;
  ifaceId: string;
}
