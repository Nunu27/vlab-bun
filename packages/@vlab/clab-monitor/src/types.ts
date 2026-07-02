import type EventEmitter from "node:events";
import type { MaybePromise } from "bun";
import type Dockerode from "dockerode";
import type { Container } from "dockerode";
import type { Logger } from "pino";

// Internal containerlab labels — always present, not configurable
export const CLAB_BUILT_IN_LABELS = {
	name: "clab-node-name",
	deviceKind: "clab-node-kind",
} as const;

// Base data resolved for every tracked node
export interface NodeInfo {
	id: string;
	deviceKind: string;
	health: string | null;
	ip: string;
}

export interface NodeData extends NodeInfo {
	name: string;
	containerId: string;
	interfaces: Record<string, string[]>;
}

export interface Events {
	"node-create": [NodeData];
	"node-remove": [string];
	"health-update": [{ id: string; health: string | null }];
	"interface-update": [{ id: string; interfaces: Record<string, string[]> }];
}

export interface BaseContext {
	docker: Dockerode;
	logger: Pick<Logger, "info" | "error" | "debug" | "warn">;
	nodeInterfaceMap: Map<string, Record<string, string[]>>;
	emitInterfaceUpdate: (data: {
		id: string;
		interfaces: Record<string, string[]>;
	}) => void;
}

export interface Context extends BaseContext {
	// Label used to resolve a container's stable node identity
	nodeIdLabel: string;
	eventEmitter: EventEmitter<Events>;
}

export type Options = Omit<
	Context,
	"eventEmitter" | "emitInterfaceUpdate" | "nodeInterfaceMap"
>;

// Docker Event Types

export interface BaseDockerEvent {
	id: string;
	time: number;
	timeNano: number;
	scope: "local" | "swarm";
}

export interface ContainerAttributes {
	name: string;
	image: string;
	[key: string]: string | undefined;
}

export interface ContainerHealthAttributes extends ContainerAttributes {
	execDuration?: string;
}

export interface NetworkAttributes {
	name: string;
	type: string;
	[key: string]: string | undefined;
}

export interface NetworkConnectAttributes extends NetworkAttributes {
	container: string;
}

export interface ImageAttributes {
	name?: string;
	[key: string]: string | undefined;
}

export interface VolumeAttributes {
	driver: string;
	[key: string]: string | undefined;
}

// TYPE: CONTAINER
export type ContainerEvent =
	| {
			Type: "container";
			Action: "destroy";
			Actor: {
				ID: string;
				Attributes: ContainerAttributes;
			};
	  }
	| {
			Type: "container";
			Action:
				| "health_status: healthy"
				| "health_status: unhealthy"
				| "health_status: starting";
			Actor: {
				ID: string;
				Attributes: ContainerHealthAttributes;
			};
	  }
	| {
			Type: "container";
			Action:
				| "create"
				| "start"
				| "stop"
				| "kill"
				| "restart"
				| "pause"
				| "unpause"
				| "rename"
				| "exec_create"
				| "exec_start"
				| "exec_die";
			Actor: {
				ID: string;
				Attributes: ContainerAttributes;
			};
	  };

// TYPE: NETWORK
export type NetworkEvent =
	| {
			Type: "network";
			Action: "connect" | "disconnect";
			Actor: {
				ID: string;
				Attributes: NetworkConnectAttributes;
			};
	  }
	| {
			Type: "network";
			Action: "create" | "destroy" | "remove";
			Actor: {
				ID: string;
				Attributes: NetworkAttributes;
			};
	  };

// TYPE: IMAGE
export type ImageEvent = {
	Type: "image";
	Action:
		| "pull"
		| "push"
		| "save"
		| "delete"
		| "tag"
		| "untag"
		| "mount"
		| "unmount";
	Actor: {
		ID: string;
		Attributes: ImageAttributes;
	};
};

// TYPE: VOLUME
export type VolumeEvent = {
	Type: "volume";
	Action: "create" | "mount" | "unmount" | "destroy";
	Actor: {
		ID: string;
		Attributes: VolumeAttributes;
	};
};

export type DockerEvent = BaseDockerEvent &
	(
		| ContainerEvent
		| NetworkEvent
		| ImageEvent
		| VolumeEvent
		| {
				Type: "daemon" | "plugin" | "service" | "node" | "secret" | "config";
				Action: string;
				Actor: {
					ID: string;
					Attributes: Record<string, string | undefined>;
				};
		  }
	);

// Network

export interface NetworkMonitor {
	start: (
		ctx: BaseContext,
		container: Container,
		node: NodeInfo,
	) => MaybePromise<void>;
	stop: (ctx: BaseContext, node: NodeInfo) => MaybePromise<void>;
	extractInterfaces: (
		ctx: BaseContext,
		container: Container,
		node: NodeInfo,
	) => MaybePromise<Record<string, string[]>>;
}
