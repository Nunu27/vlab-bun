import type EventEmitter from "node:events";
import type { MaybePromise } from "bun";
import type Dockerode from "dockerode";
import type { Container } from "dockerode";
import type { Logger } from "pino";

// Each custom mapping entry: label + whether it's required
export interface MappingEntry {
	label: string;
	required?: boolean;
}

// Internal containerlab labels — always present, not configurable
export const CLAB_BUILT_IN_LABELS = {
	name: "clab-node-name",
	deviceKind: "clab-node-kind",
} as const;

type IsRequired<T> = T extends { required: true } ? true : false;

// Base mapping keys the caller must provide (as label strings, always required)
export interface BaseMappingKeys {
	sessionId: string;
	nodeId: string;
}

// The constraint for the full mapping passed by the user
export type FullMappingConstraint = BaseMappingKeys &
	Record<string, string | MappingEntry>;

// Helper to get only the MappingEntry properties
export type UserMapping<TFullMapping extends FullMappingConstraint> = Omit<
	TFullMapping,
	keyof BaseMappingKeys
>;

// Resolved type from a user-supplied mapping: required entries → string, optional → string | undefined
export type ResolvedMapping<TFullMapping extends FullMappingConstraint> = {
	[K in keyof UserMapping<TFullMapping> as IsRequired<
		UserMapping<TFullMapping>[K]
	> extends true
		? K
		: never]: string;
} & {
	[K in keyof UserMapping<TFullMapping> as IsRequired<
		UserMapping<TFullMapping>[K]
	> extends true
		? never
		: K]?: string;
};

// Fixed base fields always available from containerlab labels
export interface BaseResolvedData {
	sessionId: string;
	nodeId: string;
	name: string;
	deviceKind: string;
}

// The full resolved data passed to filter/isTemp/isStale callbacks
export type ResolvedData<TFullMapping extends FullMappingConstraint> =
	BaseResolvedData & ResolvedMapping<TFullMapping>;

export type SessionData<TFullMapping extends FullMappingConstraint> =
	ResolvedMapping<TFullMapping> & { id: string };

export type NodeData<TFullMapping extends FullMappingConstraint> =
	ResolvedMapping<TFullMapping> & {
		id: string;
		name: string;
		health: string | null;
		ip: string;
		interfaces: Record<string, string[]>;
		containerId: string;
		labSessionId: string;
	};

export interface NodeInfo {
	id: string;
	labSessionId: string;
	deviceKind: string;
	health: string | null;
	ip: string;
	isTemp: boolean;
}

export interface Events<TFullMapping extends FullMappingConstraint> {
	snapshot: [
		{
			sessions: SessionData<TFullMapping>[];
			nodes: NodeData<TFullMapping>[];
		},
	];
	"stale-session": [string];
	"session-create": [SessionData<TFullMapping>];
	"session-remove": [string];
	"node-create": [NodeData<TFullMapping>];
	"node-remove": [string, boolean];
	"node-health": [
		{
			id: string;
			labSessionId: string;
			health: string | null;
		},
		boolean,
	];
	"interface-update": [
		{
			id: string;
			labSessionId: string;
			interfaces: Record<string, string[]>;
		},
		boolean,
	];
}

export interface BaseContext {
	docker: Dockerode;
	logger: Pick<Logger, "info" | "error" | "debug" | "warn">;
	nodeInterfaceMap: Map<string, Record<string, string[]>>;
	sessionIds: Set<string>;
	emitInterfaceUpdate: (
		data: {
			id: string;
			labSessionId: string;
			interfaces: Record<string, string[]>;
		},
		isTemp: boolean,
	) => void;
	waitForHealth: (
		id: string,
		callback: () => MaybePromise<void>,
		timeoutMs?: number,
	) => () => void;
}

export interface Context<TFullMapping extends FullMappingConstraint>
	extends BaseContext {
	mapping: TFullMapping;
	filter?: (data: ResolvedData<TFullMapping>) => boolean;
	isTemp?: (data: ResolvedData<TFullMapping>) => boolean;
	isStale?: (data: ResolvedData<TFullMapping>) => boolean;
	eventEmitter: EventEmitter<Events<TFullMapping>>;
}

export type Options<TFullMapping extends FullMappingConstraint> = Omit<
	Context<TFullMapping>,
	| "sessionIds"
	| "eventEmitter"
	| "waitForHealth"
	| "emitInterfaceUpdate"
	| "nodeInterfaceMap"
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

export interface ContainerDieAttributes extends ContainerAttributes {
	exitCode: string;
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
			Action: "die";
			Actor: {
				ID: string;
				Attributes: ContainerDieAttributes;
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
				| "destroy"
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
	checkAccess?: (ctx: BaseContext, node: NodeInfo) => MaybePromise<boolean>;
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
