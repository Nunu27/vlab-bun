/** biome-ignore-all lint/suspicious/noDoubleEquals: for loose comparison */
import { Type as t } from "@sinclair/typebox";
import { RouterOSClient } from "mikro-routeros";
import { EvaluationHandler } from "../base/evaluation-handler";
import { debounce } from "../utils";

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
		data: t.Array(
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
		),
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
			const flags = new Set(params.flag.split(""));

			console.log("Current routing table", data);
			console.log("Checking route existence with params", {
				dst: params.dst,
				gateway: params.gateway,
				flag: params.flag,
			});

			const compareFlag = (
				flagChar: string,
				routeValue: string | undefined,
			) => {
				const value = routeValue === "true";
				return flags.has(flagChar) === value;
			};

			return data.some((route) => {
				return (
					route.active &&
					route["dst-address"] === params.dst &&
					route.gateway === params.gateway &&
					compareFlag("D", route.dynamic) &&
					compareFlag("X", route.disabled) &&
					compareFlag("I", route.inactive) &&
					compareFlag("A", route.active) &&
					compareFlag("c", route.connect) &&
					compareFlag("s", route.static) &&
					compareFlag("r", route.rip) &&
					compareFlag("b", route.bgp) &&
					compareFlag("o", route.ospf) &&
					compareFlag("i", route["is-is"]) &&
					compareFlag("d", route.dhcp) &&
					compareFlag("v", route.vpn) &&
					compareFlag("m", route.modem) &&
					compareFlag("y", route["bgp-mpls-vpn"]) &&
					compareFlag("H", route["hw-offloaded"]) &&
					compareFlag("+", route.ecmp)
				);
			});
		},
	});
