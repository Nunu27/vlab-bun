import type { NodeHealth } from "@vlab/shared/enums";

export interface LabNode {
	labNodeId?: string;
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

type TempNodeHealthEvent = Record<
	`${string}:health`,
	[NodeHealth | "deleted" | null]
>;
type TempNodeIpEvent = Record<`${string}:ip`, [string]>;
type TempNodeContainerIdEvent = Record<`${string}:containerId`, [string]>;

export type TempNodeEvents = TempNodeHealthEvent &
	TempNodeIpEvent &
	TempNodeContainerIdEvent;
