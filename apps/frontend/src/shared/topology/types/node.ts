import type { LabDeviceNode } from '@vlab/shared/schemas/rest';

/**
 * Position on canvas
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Dimensions for resizable elements
 */
export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Base properties shared across all node types
 */
export interface BaseNodeData {
  id: string;
  type: string;
  x: number;
  y: number;
  selected?: boolean;
}

/**
 * Device node with networking interfaces
 */
export interface DeviceNodeData extends BaseNodeData {
  type: 'device';
  name: string;
  deviceId: string;
  groupIds?: string[];
  interfaces: boolean[];
  resources?: LabDeviceNode['resources'];
}

/**
 * Group node for organizing devices
 */
export interface GroupNodeData extends BaseNodeData {
  type: 'group';
  name: string;
  width: number;
  height: number;
  color: string;
}

/**
 * Note/text node for annotations
 */
export interface NoteNodeData extends BaseNodeData {
  type: 'note';
  content: string;
  width: number;
  height: number;
}

/**
 * Union of all node data types
 */
export type NodeData = DeviceNodeData | GroupNodeData | NoteNodeData;

/**
 * Type guards for node data
 */
export const isDeviceNode = (node: NodeData): node is DeviceNodeData =>
  node.type === 'device';

export const isGroupNode = (node: NodeData): node is GroupNodeData =>
  node.type === 'group';

export const isNoteNode = (node: NodeData): node is NoteNodeData =>
  node.type === 'note';
