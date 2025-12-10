/**
 * TypeScript types for Containerlab Topology Definition
 * Based on: https://containerlab.dev/manual/topo-def-file/
 */

/**
 * Base endpoint for brief link format
 */
export type BriefEndpoint = string; // Format: "node-name:interface-name"

/**
 * Extended endpoint configuration for links
 */
export interface ExtendedEndpoint {
	/** Node name (mandatory) */
	node: string;
	/** Interface name (mandatory) */
	interface: string;
	/** MAC address (optional) */
	mac?: string;
	/** IPv4 address with CIDR notation (optional) e.g. 192.168.0.1/24 */
	ipv4?: string;
	/** IPv6 address with CIDR notation (optional) e.g. 2001:db8::1/64 */
	ipv6?: string;
	/** Endpoint-specific variables (optional) */
	vars?: Record<string, unknown>;
}

/**
 * Link types supported by Containerlab
 */
export type LinkType =
	| "veth"
	| "mgmt-net"
	| "macvlan"
	| "host"
	| "vxlan"
	| "vxlan-stitch"
	| "dummy";

/**
 * MACVlan modes
 */
export type MacvlanMode = "private" | "vepa" | "bridge" | "passthru" | "source";

/**
 * Brief format link definition
 */
export interface BriefLink {
	/** Array of two endpoints in format ["node1:iface1", "node2:iface2"] */
	endpoints: [BriefEndpoint, BriefEndpoint];
	/** IPv4 addresses for endpoints (optional) */
	ipv4?: [string] | [string, string];
	/** IPv6 addresses for endpoints (optional) */
	ipv6?: [string] | [string, string];
	/** Link variables (optional) */
	vars?: Record<string, unknown>;
	/** Link labels (optional) */
	labels?: Record<string, string>;
}

/**
 * Extended format link definition - veth type
 */
export interface VethLink {
	type: "veth";
	/** Two endpoints for the veth pair */
	endpoints: [ExtendedEndpoint, ExtendedEndpoint];
	/** Link MTU (optional) */
	mtu?: number;
	/** Link variables (optional) */
	vars?: Record<string, unknown>;
	/** Link labels (optional) */
	labels?: Record<string, string>;
}

/**
 * Extended format link definition - mgmt-net type
 */
export interface MgmtNetLink {
	type: "mgmt-net";
	/** Single endpoint for mgmt-net */
	endpoint: ExtendedEndpoint;
	/** Host interface name (mandatory) */
	hostInterface: string;
	/** Link MTU (optional) */
	mtu?: number;
	/** Link variables (optional) */
	vars?: Record<string, unknown>;
	/** Link labels (optional) */
	labels?: Record<string, string>;
}

/**
 * Extended format link definition - macvlan type
 */
export interface MacvlanLink {
	type: "macvlan";
	/** Single endpoint for macvlan */
	endpoint: ExtendedEndpoint;
	/** Host interface name (mandatory) */
	hostInterface: string;
	/** MACVlan mode (optional, default: bridge) */
	mode?: MacvlanMode;
	/** Link variables (optional) */
	vars?: Record<string, unknown>;
	/** Link labels (optional) */
	labels?: Record<string, string>;
}

/**
 * Extended format link definition - host type
 */
export interface HostLink {
	type: "host";
	/** Single endpoint for host link */
	endpoint: ExtendedEndpoint;
	/** Host interface name (mandatory) */
	hostInterface: string;
	/** Link MTU (optional) */
	mtu?: number;
	/** Link variables (optional) */
	vars?: Record<string, unknown>;
	/** Link labels (optional) */
	labels?: Record<string, string>;
}

/**
 * Extended format link definition - vxlan type
 */
export interface VxlanLink {
	type: "vxlan";
	/** Single endpoint for vxlan */
	endpoint: ExtendedEndpoint;
	/** Remote VTEP IP (mandatory) */
	remote: string;
	/** VNI (mandatory) */
	vni: number;
	/** VTEP UDP Port (mandatory) */
	dstPort: number;
	/** Source UDP Port (optional) */
	srcPort?: number;
	/** Link MTU (optional) */
	mtu?: number;
	/** Link variables (optional) */
	vars?: Record<string, unknown>;
	/** Link labels (optional) */
	labels?: Record<string, string>;
}

/**
 * Extended format link definition - vxlan-stitch type
 */
export interface VxlanStitchLink {
	type: "vxlan-stitch";
	/** Single endpoint for vxlan-stitch */
	endpoint: ExtendedEndpoint;
	/** Remote VTEP IP (mandatory) */
	remote: string;
	/** VNI (mandatory) */
	vni: number;
	/** VTEP UDP Port (mandatory) */
	dstPort: number;
	/** Source UDP Port (optional) */
	srcPort?: number;
	/** Link MTU (optional) */
	mtu?: number;
	/** Link variables (optional) */
	vars?: Record<string, unknown>;
	/** Link labels (optional) */
	labels?: Record<string, string>;
}

/**
 * Extended format link definition - dummy type
 */
export interface DummyLink {
	type: "dummy";
	/** Single endpoint for dummy link */
	endpoint: ExtendedEndpoint;
	/** Link MTU (optional) */
	mtu?: number;
	/** Link variables (optional) */
	vars?: Record<string, unknown>;
	/** Link labels (optional) */
	labels?: Record<string, string>;
}

/**
 * Union type for all extended link formats
 */
export type ExtendedLink =
	| VethLink
	| MgmtNetLink
	| MacvlanLink
	| HostLink
	| VxlanLink
	| VxlanStitchLink
	| DummyLink;

/**
 * Link definition (can be either brief or extended format)
 */
export type Link = BriefLink | ExtendedLink;

/**
 * Node configuration
 */
export interface Node {
	/** Kind of the node (e.g., nokia_srlinux, arista_ceos, etc.) */
	kind?: string;
	/** Node type specific to the kind */
	type?: string;
	/** Container/VM image */
	image?: string;
	/** Group that the node belongs to */
	group?: string;
	/** Startup configuration file path (supports magic variables) */
	startupConfig?: string;
	/** Additional configuration file path */
	config?: string;
	/** Environment variables */
	env?: Record<string, string>;
	/** File binds (volume mounts) */
	binds?: string[];
	/** Port mappings */
	ports?: string[];
	/** Commands to execute */
	exec?: string[];
	/** Network mode */
	networkMode?: string;
	/** Custom entrypoint */
	entrypoint?: string;
	/** Custom command */
	cmd?: string;
	/** User to run as */
	user?: string;
	/** Custom labels */
	labels?: Record<string, string>;
	/** Custom node variables */
	vars?: Record<string, unknown>;
	/** Additional capabilities */
	capabilities?: string[];
	/** Sysctls */
	sysctls?: Record<string, string>;
	/** CPU count */
	cpu?: number;
	/** Memory limit */
	memory?: string;
	/** CPU set */
	cpuSet?: string;
	/** Runtime (docker, podman, etc.) */
	runtime?: string;
	/** License file path */
	license?: string;
	/** Auto-remove container on stop */
	autoRemove?: boolean;
	/** Publish all ports */
	publish?: string[];
	/** Extra hosts entries */
	extraHosts?: string[];
	/** DNS servers */
	dns?: string[];
	/** Management IPv4 address */
	mgmtIpv4?: string;
	/** Management IPv6 address */
	mgmtIpv6?: string;
	/** Sandbox image */
	sandbox?: string;
	/** Kernel modules */
	kernelModules?: string[];
	/** Configuration templates */
	configTemplates?: string[];
	/** Wait-for setting */
	waitFor?: string;
	/** Staged configuration */
	stagedConfig?: string;
	/** Enforced startup config */
	enforceStartupConfig?: boolean;
	/** Suppress startup config */
	suppressStartupConfig?: boolean;
	/** Container hostname */
	hostname?: string;
}

/**
 * Group configuration
 */
export interface Group {
	/** Kind of nodes in the group */
	kind?: string;
	/** Type of nodes in the group */
	type?: string;
	/** Image for nodes in the group */
	image?: string;
	/** Startup configuration */
	startupConfig?: string;
	/** Environment variables */
	env?: Record<string, string>;
	/** File binds */
	binds?: string[];
	/** Port mappings */
	ports?: string[];
	/** Commands to execute */
	exec?: string[];
	/** Group-specific variables */
	vars?: Record<string, unknown>;
	/** Any other node properties */
	[key: string]: unknown;
}

/**
 * Kind configuration
 */
export interface Kind {
	/** Type specific to this kind */
	type?: string;
	/** Image for this kind */
	image?: string;
	/** Startup configuration */
	startupConfig?: string;
	/** Environment variables */
	env?: Record<string, string>;
	/** File binds */
	binds?: string[];
	/** Port mappings */
	ports?: string[];
	/** Commands to execute */
	exec?: string[];
	/** Kind-specific variables */
	vars?: Record<string, unknown>;
	/** Any other node properties */
	[key: string]: unknown;
}

/**
 * Default configuration for all nodes
 */
export interface Defaults {
	/** Default kind */
	kind?: string;
	/** Default type */
	type?: string;
	/** Default image */
	image?: string;
	/** Default startup configuration */
	startupConfig?: string;
	/** Default environment variables */
	env?: Record<string, string>;
	/** Default file binds */
	binds?: string[];
	/** Default port mappings */
	ports?: string[];
	/** Default commands to execute */
	exec?: string[];
	/** Default variables */
	vars?: Record<string, unknown>;
	/** Default labels */
	labels?: Record<string, string>;
	/** Any other default node properties */
	[key: string]: unknown;
}

/**
 * Certificate Authority settings
 */
export interface CertificateAuthority {
	/** Certificate validity duration */
	validity?: string;
	/** Certificate organization */
	organization?: string;
	/** Certificate organizational unit */
	organizationalUnit?: string;
	/** Certificate country */
	country?: string;
	/** Certificate state/province */
	state?: string;
	/** Certificate locality */
	locality?: string;
}

/**
 * Global settings
 */
export interface Settings {
	/** Certificate authority settings */
	certificateAuthority?: CertificateAuthority;
	/** Additional settings */
	[key: string]: unknown;
}

/**
 * Topology configuration
 */
export interface Topology {
	/** Nodes in the topology */
	nodes?: Record<string, Node>;
	/** Links between nodes */
	links?: Link[];
	/** Groups configuration */
	groups?: Record<string, Group>;
	/** Kinds configuration */
	kinds?: Record<string, Kind>;
	/** Default configuration */
	defaults?: Defaults;
}

/**
 * Complete Containerlab topology definition
 */
export interface ContainerlabTopology {
	/** Topology name (mandatory) */
	name: string;
	/** Prefix for container names (optional) */
	prefix?: string;
	/** Topology configuration */
	topology: Topology;
	/** Global settings (optional) */
	settings?: Settings;
}
