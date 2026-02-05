import type EventEmitter from "node:events";
import type { DeviceKind, NodeHealth } from "@vlab/shared/enums";
import type { MaybePromise } from "bun";
import type Dockerode from "dockerode";
import type { Container } from "dockerode";
import type { Logger } from "pino";

export interface NodeInfo {
	id: string;
	labSessionId: string;
	deviceKind: DeviceKind;
	health: NodeHealth | null;
	ports: Record<number, number>;
}

export interface SessionData {
	id: string;
	labId: string;
	ownerId: string;
}

export interface NodeData {
	id: string;
	name: string;
	health: NodeHealth | null;
	ports: Record<number, number>;
	interfaces: Record<string, string[]>;
	labNodeId?: string;
	containerId: string;
	labSessionId: string;
	deviceTemplateId?: string;
}

export interface Events {
	snapshot: [
		{
			sessions: SessionData[];
			nodes: NodeData[];
		},
	];
	"stale-session": [string];
	"session-create": [SessionData];
	"session-remove": [string];
	"node-create": [NodeData];
	"node-remove": [string, boolean];
	"node-health": [
		{
			id: string;
			labSessionId: string;
			health: NodeHealth;
		},
	];
	"interface-update": [
		{
			id: string;
			labSessionId: string;
			interfaces: Record<string, string[]>;
		},
	];
}

export interface Context {
	host: string;
	docker: Dockerode;
	logger: Logger;
	sessionIds: Set<string>;
	eventEmitter: EventEmitter<Events>;
	waitForHealth: (
		id: string,
		callback: () => MaybePromise<void>,
		timeoutMs?: number,
	) => () => void;
}

export type Options = Omit<
	Context,
	"interfacesMap" | "sessionIds" | "eventEmitter" | "waitForHealth"
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
	ports?: number[];
	checkAccess?: (ctx: Context, node: NodeInfo) => MaybePromise<boolean>;
	start: (
		ctx: Context,
		container: Container,
		node: NodeInfo,
	) => MaybePromise<void>;
	stop: (ctx: Context, node: NodeInfo) => MaybePromise<void>;
	extractInterfaces: (
		ctx: Context,
		container: Container,
		node: NodeInfo,
	) => MaybePromise<Record<string, string[]>>;
}
