import type {
  LabDeviceNode,
  LabGroupNode,
  LabNoteNode,
  LabEdge,
  LabNodeResources,
} from '@vlab/shared/schemas';

export interface Position {
  x: number;
  y: number;
}

export interface LabDeviceInterface {
  id: string;
  name: string;
  connected: boolean;
  configurable?: boolean;
}

export type DeviceInterface = LabDeviceInterface;
export type NodeResources = LabNodeResources;

export interface BaseNodeData {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
}

export interface DeviceNodeData extends LabDeviceNode {
  selected?: boolean;
  interfaces: boolean[];
}

export interface GroupNodeData extends LabGroupNode {
  selected?: boolean;
}

export interface NoteNodeData extends LabNoteNode {
  selected?: boolean;
}

export type NodeData = DeviceNodeData | GroupNodeData | NoteNodeData;

export interface EdgeData extends LabEdge {
  selected?: boolean;
}

export interface ViewState {
  scale: number;
  x: number;
  y: number;
}

export interface ResizeState {
  nodeId: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}
