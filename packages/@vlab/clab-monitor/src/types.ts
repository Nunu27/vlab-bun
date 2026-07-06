import type { EventEmitter } from "node:events";
import type Dockerode from "dockerode";

type MaybePromise<T> = T | Promise<T>;

export type NodeHealth =
	| "starting"
	| "healthy"
	| "unhealthy"
	| "died"
	| "destroyed"
	| null;

export type NodeInterfaces = Record<string, string[]>;

export interface Events {
	"health-update": [NodeInfo, NodeHealth];
	"interface-update": [NodeInfo, NodeInterfaces];
}

export type Context = {
	emitter: EventEmitter<Events>;
	docker: Dockerode;
	logger?: Pick<typeof console, "info" | "error" | "debug" | "warn">;
	nodes: Set<string>;
	interfaceMap: Map<string, NodeInterfaces>;
	waitForHealth: (
		id: string,
		options?: { timeout?: number; signal?: AbortSignal },
	) => Promise<void>;
};

export type NodeCredentials = {
	username?: string;
	password?: string;
};

export type NodeInfo = {
	id: string;
	kind: string;
	lab: string;
	name: string;
};

export type NodeDetails = {
	ip: string;
	credentials: NodeCredentials;
};

export type NodeContext = {
	container: Dockerode.Container;
	info: NodeInfo;
	details: NodeDetails;
};

export interface NetworkMonitor {
	read: (ctx: Context, nodeCtx: NodeContext) => MaybePromise<NodeInterfaces>;
	start: (ctx: Context, nodeCtx: NodeContext) => MaybePromise<void>;
	stop: (ctx: Context, nodeCtx: NodeContext) => MaybePromise<void>;
	stopAll: (ctx: Context) => MaybePromise<void>;
}

export interface DockerContainerEvent {
	Action: string;
	Actor: {
		ID: string;
		Attributes: Record<string, string>;
	};
}
