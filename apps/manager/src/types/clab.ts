import type { NodeHealth } from "@vlab/shared/enums";

export interface LabNode {
	id: string;
	name: string;
	image: string;
	kind: string;
	env: Record<string, string>;
	resources: {
		cpu?: number | null;
		memory?: string | null;
	};
	deviceId?: string;
}

export interface LabLink {
	sourceId: string;
	sourceInterface: string;
	targetId: string;
	targetInterface: string;
}

export interface LabConfig {
	dueDate?: number;
	labId?: string;
	ownerId: string;
	nodes: LabNode[];
	links?: LabLink[];
}

export type TempNodeEvents = Record<`${string}:health`, [NodeHealth]>;
