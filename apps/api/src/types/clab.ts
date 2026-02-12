import type { NodeHealth } from "@vlab/shared/enums";

export interface LabNode {
	labNodeId?: string;
	id: string;
	name: string;
	image: string;
	kind: string;
	env: Record<string, string>;
	resources: {
		cpu?: number;
		memory?: string;
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
	labId?: string;
	ownerId: string;
	nodes: LabNode[];
	links?: LabLink[];
}

type TempNodeHealthEvent = Record<
	`${string}:health`,
	[NodeHealth | "deleted" | null]
>;
type TempNodeContainerIdEvent = Record<`${string}:ip`, [string]>;

export type TempNodeEvents = TempNodeHealthEvent & TempNodeContainerIdEvent;
