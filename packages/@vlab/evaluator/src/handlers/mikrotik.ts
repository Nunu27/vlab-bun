import { Type as t } from "@sinclair/typebox";
import { RouterOSClient } from "mikro-routeros";
import { EvaluationHandler } from "../base/evaluation-handler";
import { applyRosListEvent, throttle } from "../utils";

/**
 * RouterOS reports a route's next-hop as either a bare address ("10.10.10.2",
 * typical for static routes) or an address qualified with the resolved
 * interface ("10.10.10.2%ether3", typical for routes learned from OSPF/BGP).
 * Module authors should be able to write the next-hop they configured without
 * knowing which form the router will hand back, so compare on the address and
 * accept the qualified form too.
 */
export const gatewayMatches = (actual: string, expected: string): boolean => {
	if (actual === expected) return true;
	return (actual.split("%")[0] ?? actual) === expected;
};

export const compareFlag = (
	flags: Set<string>,
	flagChar: string,
	routeValue: string | undefined,
) => {
	const value = routeValue === "true";
	return flags.has(flagChar) === value;
};

export const IPRouteSchema = t.Array(
	t.Object({
		"dst-address": t.String(),
		gateway: t.String(),
		dynamic: t.Optional(t.String()),
		disabled: t.Optional(t.String()),
		inactive: t.Optional(t.String()),
		active: t.Optional(t.String()),
		connect: t.Optional(t.String()),
		static: t.Optional(t.String()),
		rip: t.Optional(t.String()),
		bgp: t.Optional(t.String()),
		ospf: t.Optional(t.String()),
		"is-is": t.Optional(t.String()),
		dhcp: t.Optional(t.String()),
		vpn: t.Optional(t.String()),
		modem: t.Optional(t.String()),
		"bgp-mpls-vpn": t.Optional(t.String()),
		"hw-offloaded": t.Optional(t.String()),
		ecmp: t.Optional(t.String()),
	}),
);

// OSPF Schema

export const OSPFInstanceSchema = t.Array(
	t.Object({
		".id": t.String(),
		name: t.String(),
		version: t.String(),
		vrf: t.String(),
		"router-id": t.String(),
		disabled: t.Optional(t.String()),
		inactive: t.Optional(t.String()),
	}),
);

export const OSPFAreaSchema = t.Array(
	t.Object({
		".id": t.String(),
		name: t.String(),
		instance: t.String(),
		"area-id": t.String(),
		type: t.String(),
		disabled: t.Optional(t.String()),
		inactive: t.Optional(t.String()),
		dynamic: t.Optional(t.String()),
		"transit-capable": t.Optional(t.String()),
	}),
);

export const OSPFInterfaceTemplateSchema = t.Array(
	t.Object({
		".id": t.String(),
		".nextid": t.String(),
		area: t.String(),
		interfaces: t.String(),
		"instance-id": t.String(),
		type: t.String(),
		"retransmit-interval": t.String(),
		"transmit-delay": t.String(),
		"hello-interval": t.String(),
		"dead-interval": t.String(),
		priority: t.String(),
		cost: t.String(),
		passive: t.Optional(t.String()),
		disabled: t.Optional(t.String()),
		inactive: t.Optional(t.String()),
	}),
);

export const OSPFNeighborSchema = t.Array(
	t.Object({
		".id": t.String(),
		instance: t.String(),
		area: t.String(),
		interface: t.String(),
		address: t.String(),
		priority: t.String(),
		"router-id": t.String(),
		dr: t.String(),
		bdr: t.String(),
		state: t.String(),
		"state-changes": t.String(),
		adjacency: t.String(),
		timeout: t.String(),
		virtual: t.Optional(t.String()),
		dynamic: t.Optional(t.String()),
	}),
);

// RIP Schema

export const RIPInstanceSchema = t.Array(
	t.Object({
		".id": t.String(),
		name: t.String(),
		redistribute: t.Optional(t.String()),
		disabled: t.Optional(t.String()),
	}),
);

export const RIPInterfaceTemplateSchema = t.Array(
	t.Object({
		".id": t.String(),
		instance: t.String(),
		interfaces: t.String(),
		disabled: t.Optional(t.String()),
	}),
);

// BGP Schema

export const BGPConnectionSchema = t.Array(
	t.Object({
		".id": t.String(),
		name: t.String(),
		"local.role": t.Optional(t.String()),
		"remote.as": t.Optional(t.String()),
		as: t.Optional(t.String()),
		"output.redistribute": t.Optional(t.String()),
		disabled: t.Optional(t.String()),
		inactive: t.Optional(t.String()),
	}),
);

export const BGPSessionSchema = t.Array(
	t.Object({
		".id": t.String(),
		name: t.String(),
		"remote.address": t.Optional(t.String()),
		state: t.Optional(t.String()),
		established: t.Optional(t.String()),
	}),
);

export const BGPInstanceSchema = t.Array(
	t.Object({
		".id": t.String(),
		name: t.String(),
		"router-id": t.Optional(t.String()),
		as: t.Optional(t.String()),
		inactive: t.Optional(t.String()),
		disabled: t.Optional(t.String()),
	}),
);

export const SystemIdentitySchema = t.Array(
	t.Object({
		name: t.String(),
	}),
);

// /system/note/print returns show-at-login as "true"/"false", even though it
// is set with yes/no. The check accepts either spelling.
export const SystemNoteSchema = t.Array(
	t.Object({
		note: t.Optional(t.String()),
		"show-at-login": t.Optional(t.String()),
		"show-at-cli-login": t.Optional(t.String()),
	}),
);

export const IPServiceSchema = t.Array(
	t.Object({
		".id": t.String(),
		name: t.String(),
		port: t.Optional(t.String()),
		proto: t.Optional(t.String()),
		disabled: t.Optional(t.String()),
		invalid: t.Optional(t.String()),
	}),
);

export const UserSchema = t.Array(
	t.Object({
		name: t.String(),
		group: t.String(),
	}),
);

// DNS Schema

export const DNSStaticSchema = t.Array(
	t.Object({
		".id": t.String(),
		name: t.String(),
		address: t.Optional(t.String()),
		disabled: t.Optional(t.String()),
	}),
);

// /ip/dns/print reports allow-remote-requests as "true"/"false", even though
// it is set with yes/no — same quirk as SystemNoteSchema's show-at-login.
export const DNSSettingsSchema = t.Array(
	t.Object({
		servers: t.Optional(t.String()),
		"allow-remote-requests": t.Optional(t.String()),
	}),
);

// DHCP Schema

export const DHCPPoolSchema = t.Array(
	t.Object({
		".id": t.String(),
		name: t.String(),
		ranges: t.String(),
	}),
);

export const DHCPServerSchema = t.Array(
	t.Object({
		".id": t.String(),
		name: t.String(),
		interface: t.String(),
		"address-pool": t.Optional(t.String()),
		disabled: t.Optional(t.String()),
	}),
);

export const DHCPNetworkSchema = t.Array(
	t.Object({
		".id": t.String(),
		address: t.String(),
		gateway: t.Optional(t.String()),
		"dns-server": t.Optional(t.String()),
	}),
);

export const DHCPLeaseSchema = t.Array(
	t.Object({
		".id": t.String(),
		address: t.String(),
		"mac-address": t.Optional(t.String()),
		server: t.Optional(t.String()),
		status: t.Optional(t.String()),
	}),
);

export default new EvaluationHandler("mikrotik")
	.kinds(["mikrotik_ros"])
	.withContext(
		async ({ node }) => {
			const client = new RouterOSClient(node.ip);

			await client.connect();
			await client.login(
				node.credentials?.username ?? "admin",
				node.credentials?.password ?? "admin",
			);

			return { client };
		},
		async ({ client }) => {
			client.close();
		},
	)

	// Routing
	.addSource({
		id: "log",
		data: t.String(),
		listen: async ({ client }, { notify, reportError }) => {
			const listener = await client.stream("/log/listen");

			// Example data
			// {
			//   ".id": "*34",
			//   time: "2026-04-17 09:37:56",
			//   topics: "system,info",
			//   message: "route 10.10.10.0/30 removed by ssh:vrnetlab@172.31.255.29/action:2 (/ip route remove *80000002)",
			//   "extra-info": "",
			// }
			listener.on("data", (data) => {
				notify(data.message);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
	})
	.addSource({
		id: "routing-table",
		data: IPRouteSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const doUpdate = throttle(async () => {
				try {
					const data = await client.runQuery("/ip/route/print");
					notify(data);
				} catch (error) {
					reportError(error);
				}
			}, 100);

			const listener = await client.stream("/ip/route/listen");
			listener.on("data", () => doUpdate());
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/ip/route/print");
		},
	})
	.addCheck({
		id: "route-exist",
		name: "Route Exist",
		text: "Route to {dst} should be configured",
		source: "routing-table",
		params: {
			dst: t.String({
				title: "Destination",
			}),
			gateway: t.Optional(
				t.String({
					title: "Gateway",
				}),
			),
			flag: t.Optional(
				t.String({
					title: "Flag",
					description:
						"D - DYNAMIC; X - DISABLED, I - INACTIVE, A - ACTIVE; c - CONNECT, s - STATIC, r - RIP, b - BGP, o - OSPF, i - IS-IS, d - DHCP, v - VPN, m - MODEM, y - BGP-MPLS-VPN; H - HW-OFFLOADED; + - ECMP",
				}),
			),
		},
		handler: (_, params, data) => {
			const flags = new Set(params.flag?.split("") ?? []);

			return data.some((route) => {
				return (
					route.active &&
					route["dst-address"] === params.dst &&
					(!params.gateway || gatewayMatches(route.gateway, params.gateway)) &&
					compareFlag(flags, "D", route.dynamic) &&
					compareFlag(flags, "X", route.disabled) &&
					compareFlag(flags, "I", route.inactive) &&
					compareFlag(flags, "A", route.active) &&
					compareFlag(flags, "c", route.connect) &&
					compareFlag(flags, "s", route.static) &&
					compareFlag(flags, "r", route.rip) &&
					compareFlag(flags, "b", route.bgp) &&
					compareFlag(flags, "o", route.ospf) &&
					compareFlag(flags, "i", route["is-is"]) &&
					compareFlag(flags, "d", route.dhcp) &&
					compareFlag(flags, "v", route.vpn) &&
					compareFlag(flags, "m", route.modem) &&
					compareFlag(flags, "y", route["bgp-mpls-vpn"]) &&
					compareFlag(flags, "H", route["hw-offloaded"]) &&
					compareFlag(flags, "+", route.ecmp)
				);
			});
		},
	})

	// OSPF
	// Instance
	.addSource({
		id: "ospf-instance",
		// [
		//   {
		//     ".id": "*0",
		//     name: "inst1",
		//     version: "2",
		//     vrf: "main",
		//     "router-id": "2.2.2.2",
		//     inactive: "false",
		//   }
		// ]
		data: OSPFInstanceSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof OSPFInstanceSchema.static = await client.runQuery(
				"/routing/ospf/instance/print",
			);

			const listener = await client.stream("/routing/ospf/instance/listen");

			listener.on("data", (data) => {
				applyRosListEvent(list, data, (item) => item[".id"]);
				notify(list);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/ospf/instance/print");
		},
	})
	.addCheck({
		id: "ospf-instance-exist",
		name: "OSPF Instance Exist",
		text: "OSPF instance {name} should have Router ID {routerId}",
		source: "ospf-instance",
		params: {
			name: t.String({
				title: "Instance Name",
			}),
			version: t.Optional(
				t.String({
					title: "OSPF Version",
				}),
			),
			routerId: t.String({
				title: "Router ID",
			}),
			flag: t.Optional(
				t.String({
					title: "Flag",
					description: "X - DISABLED, I - INACTIVE",
				}),
			),
		},
		handler: (_, params, data) => {
			const flags = new Set(params.flag?.split("") ?? []);

			return data.some((instance) => {
				return (
					instance.name === params.name &&
					(!params.version || instance.version === params.version) &&
					instance["router-id"] === params.routerId &&
					compareFlag(flags, "X", instance.disabled) &&
					compareFlag(flags, "I", instance.inactive)
				);
			});
		},
	})
	// Area
	.addSource({
		id: "ospf-area",
		// [
		//   {
		//     ".id": "*1",
		//     name: "backbone1",
		//     instance: "inst1",
		//     "area-id": "0.0.0.0",
		//     type: "default",
		//     inactive: "false",
		//   }
		// ]
		data: OSPFAreaSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof OSPFAreaSchema.static = await client.runQuery(
				"/routing/ospf/area/print",
			);

			const listener = await client.stream("/routing/ospf/area/listen");

			// Example data
			// {
			//   ".id": "*3",
			//   name: "backbone2",
			//   instance: "inst1",
			//   "area-id": "1.1.1.1",
			//   type: "default",
			//   inactive: "false",
			// }
			// {
			//   ".id": "*3",
			//   ".dead": "true",
			// }
			listener.on("data", (data) => {
				applyRosListEvent(list, data, (item) => item[".id"]);
				notify(list);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/ospf/area/print");
		},
	})
	.addCheck({
		id: "ospf-area-exist",
		name: "OSPF Area Exist",
		text: "OSPF area {name} should exist in instance {instance}",
		source: "ospf-area",
		params: {
			name: t.String({
				title: "Area Name",
			}),
			instance: t.String({
				title: "Instance",
			}),
			areaId: t.String({
				title: "Area ID",
			}),
			flag: t.Optional(
				t.String({
					title: "Flag",
					description:
						"D - DYNAMIC; X - DISABLED, I - INACTIVE, T - TRANSIT-CAPABLE",
				}),
			),
		},
		handler: (_, params, data) => {
			const flags = new Set(params.flag?.split("") ?? []);

			return data.some((area) => {
				return (
					area.name === params.name &&
					area.instance === params.instance &&
					area["area-id"] === params.areaId &&
					compareFlag(flags, "D", area.dynamic) &&
					compareFlag(flags, "X", area.disabled) &&
					compareFlag(flags, "I", area.inactive) &&
					compareFlag(flags, "T", area["transit-capable"])
				);
			});
		},
	})
	// Interface Template
	.addSource({
		id: "ospf-interface-template",
		data: OSPFInterfaceTemplateSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof OSPFInterfaceTemplateSchema.static = [];
			const doUpdate = throttle(async () => {
				try {
					const currentList: typeof OSPFInterfaceTemplateSchema.static =
						await client.runQuery("/routing/ospf/interface-template/print");
					list.length = 0;
					list.push(...currentList);
					notify(list);
				} catch (error) {
					reportError(error);
				}
			}, 100);

			const listener = await client.stream(
				"/routing/ospf/interface-template/listen",
			);

			listener.on("data", () => doUpdate());
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/ospf/interface-template/print");
		},
	})
	.addCheck({
		id: "ospf-interface-template-exist",
		name: "OSPF Interface Template Exist",
		text: "Interface {interfaces} should be assigned to OSPF area {area}",
		source: "ospf-interface-template",
		params: {
			interfaces: t.String({
				title: "Interfaces",
			}),
			area: t.String({
				title: "Area",
			}),
			type: t.Optional(
				t.String({
					title: "Network Type",
					description: "e.g., broadcast, ptp, ptmp, nbma",
				}),
			),
			passive: t.Optional(
				t.String({
					title: "Passive",
					description: "yes, no",
				}),
			),
			cost: t.Optional(
				t.String({
					title: "Cost",
					description: "OSPF interface cost, e.g. 10",
				}),
			),
			flag: t.Optional(
				t.String({
					title: "Flag",
					description: "X - DISABLED, I - INACTIVE",
				}),
			),
		},
		handler: (_, params, data) => {
			const flags = new Set(params.flag?.split("") ?? []);

			return data.some((template) => {
				return (
					template.interfaces.includes(params.interfaces) &&
					template.area === params.area &&
					(!params.type || template.type === params.type) &&
					(!params.cost || template.cost === params.cost) &&
					(!params.passive ||
						(params.passive === "yes" &&
							(template.passive === "true" || template.passive === "")) ||
						(params.passive === "no" &&
							(template.passive === undefined ||
								template.passive === "false"))) &&
					compareFlag(flags, "X", template.disabled) &&
					compareFlag(flags, "I", template.inactive)
				);
			});
		},
	})
	// Neighbor
	.addSource({
		id: "ospf-neighbor",
		data: OSPFNeighborSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof OSPFNeighborSchema.static = await client.runQuery(
				"/routing/ospf/neighbor/print",
			);

			const listener = await client.stream("/routing/ospf/neighbor/listen");

			listener.on("data", (data) => {
				applyRosListEvent(list, data, (item) => item[".id"]);
				notify(list);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/ospf/neighbor/print");
		},
	})
	.addCheck({
		id: "ospf-neighbor-exist",
		name: "OSPF Neighbor Exist",
		text: "OSPF neighbor on {interface} should be in {state} state",
		source: "ospf-neighbor",
		params: {
			area: t.Optional(
				t.String({
					title: "Area",
				}),
			),
			interface: t.String({
				title: "Interface",
			}),
			state: t.String({
				title: "State",
			}),
		},
		handler: (_, params, data) => {
			return data.some((neighbor) => {
				return (
					(!params.area || neighbor.area === params.area) &&
					neighbor.interface === params.interface &&
					neighbor.state === params.state
				);
			});
		},
	})

	// RIP
	// Instance
	.addSource({
		id: "rip-instance",
		data: RIPInstanceSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof RIPInstanceSchema.static = await client.runQuery(
				"/routing/rip/instance/print",
			);

			const listener = await client.stream("/routing/rip/instance/listen");

			listener.on("data", (data) => {
				applyRosListEvent(list, data, (item) => item[".id"]);
				notify(list);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/rip/instance/print");
		},
	})
	.addCheck({
		id: "rip-instance-exist",
		name: "RIP Instance Exist",
		text: "RIP instance {name} should be configured",
		source: "rip-instance",
		params: {
			name: t.String({
				title: "Name",
			}),
			redistribute: t.Optional(
				t.String({
					title: "Redistribute",
					description:
						"Comma-separated route types to redistribute (e.g. connected,static)",
				}),
			),
			flag: t.Optional(
				t.String({
					title: "Flag",
					description: "X - DISABLED",
				}),
			),
		},
		handler: (_, params, data) => {
			const flags = new Set(params.flag?.split("") ?? []);

			return data.some((instance) => {
				return (
					instance.name === params.name &&
					(!params.redistribute ||
						instance.redistribute === params.redistribute) &&
					compareFlag(flags, "X", instance.disabled)
				);
			});
		},
	})
	// Interface Template
	.addSource({
		id: "rip-interface-template",
		data: RIPInterfaceTemplateSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof RIPInterfaceTemplateSchema.static =
				await client.runQuery("/routing/rip/interface-template/print");

			const listener = await client.stream(
				"/routing/rip/interface-template/listen",
			);

			listener.on("data", (data) => {
				applyRosListEvent(list, data, (item) => item[".id"]);
				notify(list);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/rip/interface-template/print");
		},
	})
	.addCheck({
		id: "rip-interface-template-exist",
		name: "RIP Interface Template Exist",
		text: "RIP should be enabled on interface {interfaces} for instance {instance}",
		source: "rip-interface-template",
		params: {
			instance: t.String({
				title: "Instance",
			}),
			interfaces: t.String({
				title: "Interfaces",
			}),
			flag: t.Optional(
				t.String({
					title: "Flag",
					description: "X - DISABLED",
				}),
			),
		},
		handler: (_, params, data) => {
			const flags = new Set(params.flag?.split("") ?? []);

			return data.some((template) => {
				return (
					template.instance === params.instance &&
					template.interfaces === params.interfaces &&
					compareFlag(flags, "X", template.disabled)
				);
			});
		},
	})

	// BGP
	.addSource({
		id: "bgp-instance",
		data: BGPInstanceSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof BGPInstanceSchema.static = await client.runQuery(
				"/routing/bgp/instance/print",
			);

			const listener = await client.stream("/routing/bgp/instance/listen");

			listener.on("data", (data) => {
				applyRosListEvent(list, data, (item) => item[".id"]);
				notify(list);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/bgp/instance/print");
		},
	})
	.addCheck({
		id: "bgp-instance-exist",
		name: "BGP Instance Exist",
		text: "BGP instance {name} should have Router ID {routerId}",
		source: "bgp-instance",
		params: {
			name: t.String({
				title: "Instance Name",
			}),
			as: t.String({
				title: "AS",
			}),
			routerId: t.String({
				title: "Router ID",
			}),
			flag: t.Optional(
				t.String({
					title: "Flag",
					description: "X - DISABLED, I - INACTIVE",
				}),
			),
		},
		handler: (_, params, data) => {
			const flags = new Set(params.flag?.split("") ?? []);

			return data.some((instance) => {
				return (
					instance.name === params.name &&
					instance.as === params.as &&
					instance["router-id"] === params.routerId &&
					compareFlag(flags, "X", instance.disabled) &&
					compareFlag(flags, "I", instance.inactive)
				);
			});
		},
	})
	// Connection
	.addSource({
		id: "bgp-connection",
		data: BGPConnectionSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof BGPConnectionSchema.static = await client.runQuery(
				"/routing/bgp/connection/print",
			);

			const listener = await client.stream("/routing/bgp/connection/listen");

			listener.on("data", (data) => {
				applyRosListEvent(list, data, (item) => item[".id"]);
				notify(list);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/bgp/connection/print");
		},
	})
	.addCheck({
		id: "bgp-connection-exist",
		name: "BGP Connection Exist",
		text: "BGP connection {name} should be configured",
		source: "bgp-connection",
		params: {
			name: t.String({
				title: "Name",
			}),
			"local.role": t.Optional(
				t.String({
					title: "Local Role",
				}),
			),
			"remote.as": t.Optional(
				t.String({
					title: "Remote AS",
				}),
			),
			as: t.Optional(
				t.String({
					title: "AS",
				}),
			),
			"output.redistribute": t.Optional(
				t.String({
					title: "Output Redistribute",
					description:
						"Comma-separated route types to redistribute into BGP (e.g. connected,static)",
				}),
			),
		},
		handler: (_, params, data) => {
			return data.some((conn) => {
				return (
					conn.name === params.name &&
					(!params["local.role"] ||
						conn["local.role"] === params["local.role"]) &&
					(!params["remote.as"] || conn["remote.as"] === params["remote.as"]) &&
					(!params.as || conn.as === params.as) &&
					(!params["output.redistribute"] ||
						conn["output.redistribute"] === params["output.redistribute"])
				);
			});
		},
	})
	// Session
	.addSource({
		id: "bgp-session",
		data: BGPSessionSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const doUpdate = throttle(async () => {
				try {
					const data = await client.runQuery("/routing/bgp/session/print");
					notify(data);
				} catch (error) {
					reportError(error);
				}
			}, 100);

			const listener = await client.stream("/routing/bgp/session/listen");
			listener.on("data", () => doUpdate());
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/bgp/session/print");
		},
	})
	.addCheck({
		id: "bgp-session-established",
		name: "BGP Session Established",
		text: "Should have established BGP session to {remote.address}",
		source: "bgp-session",
		params: {
			"remote.address": t.String({
				title: "Remote Address",
			}),
		},
		handler: (_, params, data) => {
			return data.some((session) => {
				const isEstablished =
					session.established === "true" ||
					session.state?.toLowerCase() === "established";
				return (
					session["remote.address"] === params["remote.address"] &&
					isEstablished
				);
			});
		},
	})
	// System Identity
	.addSource({
		id: "system-identity",
		data: SystemIdentitySchema,
		listen: async ({ client }, { notify, subscribe }) => {
			const doUpdate = throttle(async () => {
				const data = await client.runQuery("/system/identity/print");
				notify(data);
			}, 100);

			return subscribe("log", async (data) => {
				if (!data.includes("system identity changed")) return;
				doUpdate();
			});
		},
		read: async ({ client }) => {
			return await client.runQuery("/system/identity/print");
		},
	})
	.addCheck({
		id: "system-identity",
		name: "System Identity",
		text: "System identity should be set to {name}",
		source: "system-identity",
		params: {
			name: t.String({
				title: "Identity Name",
			}),
		},
		handler: (_, params, data) => {
			return data.length > 0 && data[0]?.name === params.name;
		},
	})
	.addSource({
		id: "system-note",
		data: SystemNoteSchema,
		listen: async ({ client }, { notify, subscribe }) => {
			const doUpdate = throttle(async () => {
				const data = await client.runQuery("/system/note/print");
				notify(data);
			}, 100);

			return subscribe("log", async (data) => {
				if (!data.includes("system note")) return;
				doUpdate();
			});
		},
		read: async ({ client }) => {
			return await client.runQuery("/system/note/print");
		},
	})
	.addCheck({
		id: "system-note",
		name: "System Note (Banner)",
		text: "Login banner should be set to {note}",
		source: "system-note",
		params: {
			note: t.String({
				title: "Note",
				description: "Banner text shown at login",
			}),
			showAtLogin: t.Optional(
				t.String({
					title: "Show At Login",
					description: "yes, no",
				}),
			),
		},
		handler: (_, params, data) => {
			const entry = data[0];
			if (!entry || entry.note !== params.note) return false;
			if (!params.showAtLogin) return true;

			const shown = entry["show-at-login"] === "true";
			return params.showAtLogin === "yes" ? shown : !shown;
		},
	})
	.addSource({
		id: "ip-services",
		data: IPServiceSchema,
		listen: async ({ client }, { notify, subscribe }) => {
			const doUpdate = throttle(async () => {
				const data = await client.runQuery("/ip/service/print");
				notify(data);
			}, 100);

			return subscribe("log", async (data) => {
				if (!data.includes("ip service")) return;
				doUpdate();
			});
		},
		read: async ({ client }) => {
			return await client.runQuery("/ip/service/print");
		},
	})
	.addCheck({
		id: "ip-service",
		name: "IP Service State",
		text: "Service {name} should be disabled={disabled}",
		source: "ip-services",
		params: {
			name: t.String({
				title: "Service Name",
				description: "e.g. telnet, ftp, www, ssh, api, winbox",
			}),
			disabled: t.String({
				title: "Disabled",
				description: "yes, no",
			}),
		},
		handler: (_, params, data) => {
			const service = data.find((entry) => entry.name === params.name);
			if (!service) return false;

			const isDisabled = service.disabled === "true";
			return params.disabled === "yes" ? isDisabled : !isDisabled;
		},
	})
	// Users
	.addSource({
		id: "users",
		data: UserSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof UserSchema.static =
				await client.runQuery("/user/print");

			const listener = await client.stream("/user/listen");

			listener.on("data", (data) => {
				applyRosListEvent(list, data, (item) => item.name);
				notify(list);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/user/print");
		},
	})
	.addCheck({
		id: "user-exist",
		name: "User Exist",
		text: "User {username} should exist",
		source: "users",
		params: {
			username: t.String({
				title: "Username",
			}),
			group: t.Optional(
				t.String({
					title: "Group",
					description: "e.g. read, write, full",
				}),
			),
		},
		handler: (_, params, data) => {
			return data.some(
				(user) =>
					user.name === params.username &&
					(!params.group || user.group === params.group),
			);
		},
	})

	// DNS
	.addSource({
		id: "dns-static",
		data: DNSStaticSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof DNSStaticSchema.static = await client.runQuery(
				"/ip/dns/static/print",
			);

			const listener = await client.stream("/ip/dns/static/listen");

			listener.on("data", (data) => {
				applyRosListEvent(list, data, (item) => item[".id"]);
				notify(list);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/ip/dns/static/print");
		},
	})
	.addCheck({
		id: "dns-static-exist",
		name: "DNS Static Entry Exist",
		text: "DNS static entry {name} should resolve to {address}",
		source: "dns-static",
		params: {
			name: t.String({
				title: "Name",
			}),
			address: t.String({
				title: "Address",
			}),
			flag: t.Optional(
				t.String({
					title: "Flag",
					description: "X - DISABLED",
				}),
			),
		},
		handler: (_, params, data) => {
			const flags = new Set(params.flag?.split("") ?? []);

			return data.some(
				(entry) =>
					entry.name === params.name &&
					entry.address === params.address &&
					compareFlag(flags, "X", entry.disabled),
			);
		},
	})
	.addSource({
		id: "dns-settings",
		data: DNSSettingsSchema,
		listen: async ({ client }, { notify, subscribe }) => {
			const doUpdate = throttle(async () => {
				const data = await client.runQuery("/ip/dns/print");
				notify(data);
			}, 100);

			return subscribe("log", async (data) => {
				// Confirmed against a real RouterOS instance: "/ip dns set ..."
				// logs a line like "dns changed by api:admin@... (/ip dns set
				// allow-remote-requests=yes)".
				if (!data.includes("dns changed")) return;
				doUpdate();
			});
		},
		read: async ({ client }) => {
			return await client.runQuery("/ip/dns/print");
		},
	})
	.addCheck({
		id: "dns-allow-remote-requests",
		name: "DNS Allow Remote Requests",
		text: "R1 should accept DNS requests from other hosts (allow-remote-requests=yes)",
		source: "dns-settings",
		params: {},
		handler: (_, __, data) => {
			return data[0]?.["allow-remote-requests"] === "true";
		},
	})

	// DHCP
	.addSource({
		id: "dhcp-pool",
		data: DHCPPoolSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof DHCPPoolSchema.static =
				await client.runQuery("/ip/pool/print");

			const listener = await client.stream("/ip/pool/listen");

			listener.on("data", (data) => {
				applyRosListEvent(list, data, (item) => item[".id"]);
				notify(list);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/ip/pool/print");
		},
	})
	.addCheck({
		id: "dhcp-pool-exist",
		name: "DHCP Pool Exist",
		text: "DHCP pool {name} should cover {ranges}",
		source: "dhcp-pool",
		params: {
			name: t.String({
				title: "Pool Name",
			}),
			ranges: t.Optional(
				t.String({
					title: "Ranges",
				}),
			),
		},
		handler: (_, params, data) => {
			return data.some(
				(pool) =>
					pool.name === params.name &&
					(!params.ranges || pool.ranges === params.ranges),
			);
		},
	})
	.addSource({
		id: "dhcp-server",
		data: DHCPServerSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof DHCPServerSchema.static = await client.runQuery(
				"/ip/dhcp-server/print",
			);

			const listener = await client.stream("/ip/dhcp-server/listen");

			listener.on("data", (data) => {
				applyRosListEvent(list, data, (item) => item[".id"]);
				notify(list);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/ip/dhcp-server/print");
		},
	})
	.addCheck({
		id: "dhcp-server-exist",
		name: "DHCP Server Exist",
		text: "DHCP server {name} should be bound to {interface}",
		source: "dhcp-server",
		params: {
			name: t.String({
				title: "Name",
			}),
			interface: t.String({
				title: "Interface",
			}),
			addressPool: t.Optional(
				t.String({
					title: "Address Pool",
				}),
			),
			flag: t.Optional(
				t.String({
					title: "Flag",
					description: "X - DISABLED",
				}),
			),
		},
		handler: (_, params, data) => {
			const flags = new Set(params.flag?.split("") ?? []);

			return data.some(
				(srv) =>
					srv.name === params.name &&
					srv.interface === params.interface &&
					(!params.addressPool || srv["address-pool"] === params.addressPool) &&
					compareFlag(flags, "X", srv.disabled),
			);
		},
	})
	.addSource({
		id: "dhcp-network",
		data: DHCPNetworkSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof DHCPNetworkSchema.static = await client.runQuery(
				"/ip/dhcp-server/network/print",
			);

			const listener = await client.stream("/ip/dhcp-server/network/listen");

			listener.on("data", (data) => {
				applyRosListEvent(list, data, (item) => item[".id"]);
				notify(list);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/ip/dhcp-server/network/print");
		},
	})
	.addCheck({
		id: "dhcp-network-exist",
		name: "DHCP Network Exist",
		text: "DHCP network {address} should hand out gateway {gateway}",
		source: "dhcp-network",
		params: {
			address: t.String({
				title: "Network",
			}),
			gateway: t.Optional(
				t.String({
					title: "Gateway",
				}),
			),
			dnsServer: t.Optional(
				t.String({
					title: "DNS Server",
				}),
			),
		},
		handler: (_, params, data) => {
			return data.some(
				(net) =>
					net.address === params.address &&
					(!params.gateway || net.gateway === params.gateway) &&
					(!params.dnsServer ||
						(net["dns-server"] ?? "").split(",").includes(params.dnsServer)),
			);
		},
	})
	.addSource({
		id: "dhcp-lease",
		data: DHCPLeaseSchema,
		listen: async ({ client }, { notify, reportError }) => {
			const list: typeof DHCPLeaseSchema.static = await client.runQuery(
				"/ip/dhcp-server/lease/print",
			);

			const listener = await client.stream("/ip/dhcp-server/lease/listen");

			listener.on("data", (data) => {
				applyRosListEvent(list, data, (item) => item[".id"]);
				notify(list);
			});
			listener.on("error", reportError);

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/ip/dhcp-server/lease/print");
		},
	})
	.addCheck({
		id: "dhcp-lease-bound",
		name: "DHCP Lease Bound",
		text: "DHCP server {server} should have a bound lease",
		source: "dhcp-lease",
		params: {
			server: t.Optional(
				t.String({
					title: "Server Name",
				}),
			),
			address: t.Optional(
				t.String({
					title: "Address",
				}),
			),
		},
		handler: (_, params, data) => {
			return data.some(
				(lease) =>
					lease.status === "bound" &&
					(!params.server || lease.server === params.server) &&
					(!params.address || lease.address === params.address),
			);
		},
	});
