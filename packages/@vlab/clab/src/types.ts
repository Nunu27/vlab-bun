export interface ContainerlabOptions {
	topologiesPath: string;
	cliPath?: string;
}

export interface DeployOptions {
	reconfigure?: boolean;
	maxWorkers?: number;
	runtime?: "docker" | "podman" | (string & {});
	timeout?: string;
	logLevel?: "trace" | "debug" | "info" | "warning" | "error" | "fatal";
	nodeFilter?: string | readonly string[];
	skipPostDeploy?: boolean;
	skipLabdirAcl?: boolean;
	owner?: string;
}

export interface DestroyOptions {
	graceful?: boolean;
	nodeFilter?: string | readonly string[];
}

export interface ContainerlabMgmtConfig extends ContainerlabUnknownFields {
	network?: string;
	"ipv4-subnet"?: string;
	"ipv6-subnet"?: string;
	"ipv4-gw"?: string;
	"ipv6-gw"?: string;
	"ipv4-range"?: string;
	"ipv6-range"?: string;
	bridge?: string;
	mtu?: number;
}

export interface ContainerlabTopologyDefinition
	extends ContainerlabUnknownFields {
	name?: string;
	prefix?: string;
	mgmt?: ContainerlabMgmtConfig;
	topology: ContainerlabTopology;
}

export interface ContainerlabTopology extends ContainerlabUnknownFields {
	defaults?: ContainerlabNodeDefinition;
	kinds?: Record<string, ContainerlabNodeDefinition>;
	groups?: Record<string, ContainerlabNodeDefinition>;
	nodes: Record<string, ContainerlabNodeDefinition>;
	links?: ContainerlabLinkDefinition[];
}

export interface ContainerlabNodeDefinition extends ContainerlabUnknownFields {
	kind?: string;
	type?: string;
	image?: string;
	group?: string;
	labels?: Record<string, string>;
	env?: Record<string, ContainerlabScalar>;
	"env-files"?: string[];
	binds?: string[];
	ports?: string[];
	cmd?: string;
	exec?: string[];
	"startup-config"?: string;
	"startup-delay"?: number;
	"enforce-startup-config"?: boolean;
	"auto-remove"?: boolean;
	"network-mode"?: string;
	"mgmt-ipv4"?: string;
	"mgmt-ipv6"?: string;
	license?: string;
	cpu?: number;
	memory?: string;
	"cpu-set"?: string;
	ulimits?: Record<string, number | string>;
}

export type ContainerlabLinkDefinition =
	| ContainerlabBriefLink
	| ContainerlabVethLink
	| ContainerlabMgmtNetLink
	| ContainerlabHostLink
	| ContainerlabMacvlanLink
	| ContainerlabVxlanLink
	| ContainerlabGenericLink;

export interface ContainerlabBriefLink extends ContainerlabUnknownFields {
	endpoints: readonly [string, string];
}

export interface ContainerlabLinkEndpoint extends ContainerlabUnknownFields {
	node: string;
	interface: string;
	mac?: string;
	ipv4?: string;
	ipv6?: string;
}

export interface ContainerlabVethLink extends ContainerlabUnknownFields {
	type: "veth";
	endpoints: readonly [ContainerlabLinkEndpoint, ContainerlabLinkEndpoint];
	mtu?: number;
	vars?: Record<string, ContainerlabUnknownValue>;
	labels?: Record<string, string>;
}

export interface ContainerlabMgmtNetLink extends ContainerlabUnknownFields {
	type: "mgmt-net";
	endpoint: ContainerlabLinkEndpoint;
	"host-interface": string;
	mtu?: number;
	vars?: Record<string, ContainerlabUnknownValue>;
	labels?: Record<string, string>;
}

export interface ContainerlabHostLink extends ContainerlabUnknownFields {
	type: "host";
	endpoint: ContainerlabLinkEndpoint;
	"host-interface": string;
	mtu?: number;
	vars?: Record<string, ContainerlabUnknownValue>;
	labels?: Record<string, string>;
}

export interface ContainerlabMacvlanLink extends ContainerlabUnknownFields {
	type: "macvlan";
	endpoint: ContainerlabLinkEndpoint;
	"host-interface": string;
	mode?: "private" | "vepa" | "bridge" | "passthru" | "source" | (string & {});
	vars?: Record<string, ContainerlabUnknownValue>;
	labels?: Record<string, string>;
}

export interface ContainerlabVxlanLink extends ContainerlabUnknownFields {
	type: "vxlan" | "vxlan-stitched";
	endpoint?: ContainerlabLinkEndpoint;
	endpoints?: readonly [ContainerlabLinkEndpoint, ContainerlabLinkEndpoint];
	"remote-ip"?: string;
	vni?: number;
	udpport?: number;
	mtu?: number;
	vars?: Record<string, ContainerlabUnknownValue>;
	labels?: Record<string, string>;
}

export interface ContainerlabGenericLink extends ContainerlabUnknownFields {
	type: string;
}

export interface ContainerlabInspectNode {
	labName: string;
	labPath?: string;
	absLabPath?: string;
	name: string;
	containerId: string;
	image: string;
	kind: string;
	state: string;
	status?: string;
	ipv4Address?: string;
	ipv6Address?: string;
	owner?: string;
	raw: Record<string, unknown>;
}

export type ContainerlabScalar = string | number | boolean | null;
export type ContainerlabUnknownValue =
	| ContainerlabScalar
	| ContainerlabUnknownValue[]
	| { [key: string]: ContainerlabUnknownValue };

export interface ContainerlabUnknownFields {
	[key: string]: unknown;
}
