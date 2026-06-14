import { Type as t } from "@sinclair/typebox";
import { RouterOSClient } from "mikro-routeros";
import { EvaluationHandler } from "../base/evaluation-handler";
import { debounce, removeItemFromArrayByIndex } from "../utils";

const compareFlag = (
	flags: Set<string>,
	flagChar: string,
	routeValue: string | undefined,
) => {
	const value = routeValue === "true";
	return flags.has(flagChar) === value;
};

const IPRouteSchema = t.Array(
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

const OSPFInstanceSchema = t.Array(
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

const OSPFAreaSchema = t.Array(
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

const OSPFInterfaceTemplateSchema = t.Array(
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
		disabled: t.Optional(t.String()),
		inactive: t.Optional(t.String()),
	}),
);

const OSPFNeighborSchema = t.Array(
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

const RIPInstanceSchema = t.Array(
	t.Object({
		".id": t.String(),
		name: t.String(),
		disabled: t.Optional(t.String()),
	}),
);

const RIPInterfaceTemplateSchema = t.Array(
	t.Object({
		".id": t.String(),
		instance: t.String(),
		interfaces: t.String(),
		disabled: t.Optional(t.String()),
	}),
);

// BGP Schema

const BGPInstanceSchema = t.Array(
	t.Object({
		".id": t.String(),
		name: t.String(),
		"router-id": t.Optional(t.String()),
		as: t.Optional(t.String()),
		inactive: t.Optional(t.String()),
		disabled: t.Optional(t.String()),
	}),
);

const SystemIdentitySchema = t.Array(
	t.Object({
		name: t.String(),
	}),
);

const UserSchema = t.Array(
	t.Object({
		name: t.String(),
		group: t.String(),
	}),
);

export default new EvaluationHandler("mikrotik")
	.kinds(["mikrotik_ros"])
	.withContext(
		async ({ node }) => {
			const client = new RouterOSClient(node.ip);

			await client.connect();
			await client.login("admin", "admin");

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
		listen: async ({ client }, notify) => {
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

			return listener.cancel;
		},
	})
	.addSource({
		id: "routing-table",
		data: IPRouteSchema,
		listen: ({ client }, notify, subscribe) => {
			// Example data
			// [
			//   {
			//     ".id": "*80000002",
			//     "dst-address": "10.10.10.0/30",
			//     "routing-table": "main",
			//     gateway: "192.168.10.1",
			//     "immediate-gw": "",
			//     distance: "1",
			//     scope: "30",
			//     "target-scope": "10",
			//     dynamic: "false",
			//     inactive: "true",
			//     static: "true",
			//   }, {
			//     ".id": "*20183020",
			//     "dst-address": "172.31.255.28/30",
			//     "routing-table": "main",
			//     gateway: "ether1",
			//     "immediate-gw": "ether1",
			//     distance: "0",
			//     scope: "10",
			//     "target-scope": "5",
			//     "local-address": "172.31.255.30%ether1",
			//     dynamic: "true",
			//     inactive: "false",
			//     active: "true",
			//     connect: "true",
			//   }
			// ]
			const doUpdate = debounce(async () => {
				const data = await client.runQuery("/ip/route/print");
				notify(data);
			}, 500);

			return subscribe("log", async (message) => {
				if (!message.startsWith("route")) return;
				await doUpdate();
			});
		},
		read: async ({ client }) => {
			return await client.runQuery("/ip/route/print");
		},
	})
	.addCheck({
		id: "route-exist",
		name: "Route Exist",
		text: "Should have route to {dst} through {gateway}",
		source: "routing-table",
		params: {
			dst: t.String({
				title: "Destination",
			}),
			gateway: t.String({
				title: "Gateway",
			}),
			flag: t.String({
				title: "Flag",
				description:
					"D - DYNAMIC; X - DISABLED, I - INACTIVE, A - ACTIVE; c - CONNECT, s - STATIC, r - RIP, b - BGP, o - OSPF, i - IS-IS, d - DHCP, v - VPN, m - MODEM, y - BGP-MPLS-VPN; H - HW-OFFLOADED; + - ECMP",
			}),
		},
		handler: (_, params, data) => {
			const flags = new Set(params.flag?.split("") ?? []);

			return data.some((route) => {
				return (
					route.active &&
					route["dst-address"] === params.dst &&
					route.gateway === params.gateway &&
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
		listen: async ({ client }, notify) => {
			const list: typeof OSPFInstanceSchema.static = await client.runQuery(
				"/routing/ospf/instance/print",
			);

			const listener = await client.stream("/routing/ospf/instance/listen");

			listener.on("data", (data) => {
				const index = list.findIndex((item) => item[".id"] === data[".id"]);
				const isDead = data[".dead"] === "true";

				if (index === -1) {
					if (isDead) return;
					list.push(data);
				} else if (isDead) {
					removeItemFromArrayByIndex(list, index);
				} else {
					list[index] = data;
				}

				notify(list);
			});

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/ospf/instance/print");
		},
	})
	.addCheck({
		id: "ospf-instance-exist",
		name: "OSPF Instance Exist",
		text: "Should have OSPF instance named {name} with router id {routerId}",
		source: "ospf-instance",
		params: {
			name: t.String({
				title: "Instance Name",
			}),
			version: t.String({
				title: "OSPF Version",
			}),
			routerId: t.String({
				title: "Router ID",
			}),
			flag: t.String({
				title: "Flag",
				description: "X - DISABLED, I - INACTIVE",
			}),
		},
		handler: (_, params, data) => {
			const flags = new Set(params.flag?.split("") ?? []);

			return data.some((instance) => {
				return (
					instance.name === params.name &&
					instance.version === params.version &&
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
		listen: async ({ client }, notify) => {
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
				const index = list.findIndex((item) => item[".id"] === data[".id"]);
				const isDead = data[".dead"] === "true";

				if (index === -1) {
					if (isDead) return;
					list.push(data);
				} else if (isDead) {
					removeItemFromArrayByIndex(list, index);
				} else {
					list[index] = data;
				}

				notify(list);
			});

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/ospf/area/print");
		},
	})
	.addCheck({
		id: "ospf-area-exist",
		name: "OSPF Area Exist",
		text: "Should have OSPF area named {name} in instance {instance}",
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
			flag: t.String({
				title: "Flag",
				description:
					"D - DYNAMIC; X - DISABLED, I - INACTIVE, T - TRANSIT-CAPABLE",
			}),
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
		listen: async ({ client }, notify) => {
			const list: typeof OSPFInterfaceTemplateSchema.static =
				await client.runQuery("/routing/ospf/interface-template/print");

			const listener = await client.stream(
				"/routing/ospf/interface-template/listen",
			);

			listener.on("data", (data) => {
				const index = list.findIndex((item) => item[".id"] === data[".id"]);
				const isDead = data[".dead"] === "true";

				if (index === -1) {
					if (isDead) return;
					list.push(data);
				} else if (isDead) {
					removeItemFromArrayByIndex(list, index);
				} else {
					list[index] = data;
				}

				notify(list);
			});

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/ospf/interface-template/print");
		},
	})
	.addCheck({
		id: "ospf-interface-template-exist",
		name: "OSPF Interface Template Exist",
		text: "Should have OSPF interface template with interfaces {interfaces} in area {area}",
		source: "ospf-interface-template",
		params: {
			interfaces: t.String({
				title: "Interfaces",
			}),
			area: t.String({
				title: "Area",
			}),
			flag: t.String({
				title: "Flag",
				description: "X - DISABLED, I - INACTIVE",
			}),
		},
		handler: (_, params, data) => {
			const flags = new Set(params.flag?.split("") ?? []);

			return data.some((template) => {
				return (
					template.interfaces === params.interfaces &&
					template.area === params.area &&
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
		listen: async ({ client }, notify) => {
			const list: typeof OSPFNeighborSchema.static = await client.runQuery(
				"/routing/ospf/neighbor/print",
			);

			const listener = await client.stream("/routing/ospf/neighbor/listen");

			listener.on("data", (data) => {
				const index = list.findIndex((item) => item[".id"] === data[".id"]);
				const isDead = data[".dead"] === "true";

				if (index === -1) {
					if (isDead) return;
					list.push(data);
				} else if (isDead) {
					removeItemFromArrayByIndex(list, index);
				} else {
					list[index] = data;
				}

				notify(list);
			});

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/ospf/neighbor/print");
		},
	})
	.addCheck({
		id: "ospf-neighbor-exist",
		name: "OSPF Neighbor Exist",
		text: "Should have {interface} as OSPF neighbor in area {area} with state {state}",
		source: "ospf-neighbor",
		params: {
			area: t.String({
				title: "Area",
			}),
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
					neighbor.area === params.area &&
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
		listen: async ({ client }, notify) => {
			const list: typeof RIPInstanceSchema.static = await client.runQuery(
				"/routing/rip/instance/print",
			);

			const listener = await client.stream("/routing/rip/instance/listen");

			listener.on("data", (data) => {
				const index = list.findIndex((item) => item[".id"] === data[".id"]);
				const isDead = data[".dead"] === "true";

				if (index === -1) {
					if (isDead) return;
					list.push(data);
				} else if (isDead) {
					removeItemFromArrayByIndex(list, index);
				} else {
					list[index] = data;
				}

				notify(list);
			});

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/rip/instance/print");
		},
	})
	.addCheck({
		id: "rip-instance-exist",
		name: "RIP Instance Exist",
		text: "Should have RIP instance named {name} with flag {flag}",
		source: "rip-instance",
		params: {
			name: t.String({
				title: "Name",
			}),
			flag: t.String({
				title: "Flag",
				description: "X - DISABLED",
			}),
		},
		handler: (_, params, data) => {
			const flags = new Set(params.flag?.split("") ?? []);

			return data.some((instance) => {
				return (
					instance.name === params.name &&
					compareFlag(flags, "X", instance.disabled)
				);
			});
		},
	})
	// Interface Template
	.addSource({
		id: "rip-interface-template",
		data: RIPInterfaceTemplateSchema,
		listen: async ({ client }, notify) => {
			const list: typeof RIPInterfaceTemplateSchema.static =
				await client.runQuery("/routing/rip/interface-template/print");

			const listener = await client.stream(
				"/routing/rip/interface-template/listen",
			);

			listener.on("data", (data) => {
				const index = list.findIndex((item) => item[".id"] === data[".id"]);
				const isDead = data[".dead"] === "true";

				if (index === -1) {
					if (isDead) return;
					list.push(data);
				} else if (isDead) {
					removeItemFromArrayByIndex(list, index);
				} else {
					list[index] = data;
				}

				notify(list);
			});

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/rip/interface-template/print");
		},
	})
	.addCheck({
		id: "rip-interface-template-exist",
		name: "RIP Interface Template Exist",
		text: "Should have RIP interface template with interfaces {interfaces} in instance {instance}",
		source: "rip-interface-template",
		params: {
			instance: t.String({
				title: "Instance",
			}),
			interfaces: t.String({
				title: "Interfaces",
			}),
			flag: t.String({
				title: "Flag",
				description: "X - DISABLED",
			}),
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
		listen: async ({ client }, notify) => {
			const list: typeof BGPInstanceSchema.static = await client.runQuery(
				"/routing/bgp/instance/print",
			);

			const listener = await client.stream("/routing/bgp/instance/listen");

			listener.on("data", (data) => {
				const index = list.findIndex((item) => item[".id"] === data[".id"]);
				const isDead = data[".dead"] === "true";

				if (index === -1) {
					if (isDead) return;
					list.push(data);
				} else if (isDead) {
					removeItemFromArrayByIndex(list, index);
				} else {
					list[index] = data;
				}

				notify(list);
			});

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/routing/bgp/instance/print");
		},
	})
	.addCheck({
		id: "bgp-instance-exist",
		name: "BGP Instance Exist",
		text: "Should have BGP instance named {name} with router id {routerId}",
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
			flag: t.String({
				title: "Flag",
				description: "X - DISABLED, I - INACTIVE",
			}),
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
	// System Identity
	.addSource({
		id: "system-identity",
		data: SystemIdentitySchema,
		listen: async ({ client }, notify) => {
			const list: typeof SystemIdentitySchema.static = await client.runQuery(
				"/system/identity/print",
			);

			const listener = await client.stream("/log/listen");

			listener.on("data", async (data) => {
				if (data.message?.includes("system identity changed")) {
					try {
						const newList = await client.runQuery("/system/identity/print");
						list[0] = newList[0];
						notify(list);
					} catch (e) {
						console.error("Failed to update identity", e);
					}
				}
			});

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/system/identity/print");
		},
	})
	.addCheck({
		id: "system-identity",
		name: "System Identity",
		text: "Should have identity {name}",
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
	// Users
	.addSource({
		id: "users",
		data: UserSchema,
		listen: async ({ client }, notify) => {
			const list: typeof UserSchema.static =
				await client.runQuery("/user/print");

			const listener = await client.stream("/user/listen");

			listener.on("data", (data) => {
				const index = list.findIndex((item) => item.name === data.name);
				const isDead = data[".dead"] === "true";

				if (index === -1) {
					if (isDead) return;
					list.push(data);
				} else if (isDead) {
					removeItemFromArrayByIndex(list, index);
				} else {
					list[index] = data;
				}

				notify(list);
			});

			return listener.cancel;
		},
		read: async ({ client }) => {
			return await client.runQuery("/user/print");
		},
	})
	.addCheck({
		id: "user-exist",
		name: "User Exist",
		text: "Should have user {username}",
		source: "users",
		params: {
			username: t.String({
				title: "Username",
			}),
		},
		handler: (_, params, data) => {
			return data.some((user) => user.name === params.username);
		},
	});
