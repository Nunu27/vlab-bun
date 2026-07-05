import type { NodeHealth } from "@vlab/shared/enums";

export type Position = {
	x: number;
	y: number;
};

export type BoundingBox = {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
};

export type Dimensions = {
	width: number;
	height: number;
};

export interface ViewState extends Position {
	scale: number;
}

export type NodeData = {
	id: string;
	interfaces: Record<string, string[]>;
	health: NodeHealth;
};

export type ConnectionEntry = {
	deviceId: string;
	interface: string;
};

export type Dictionary<K extends string, V> = Record<K, V | undefined>;
