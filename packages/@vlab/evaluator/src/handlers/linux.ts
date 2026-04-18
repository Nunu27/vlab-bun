import { PassThrough } from "node:stream";
import { Type as t } from "@sinclair/typebox";
import type { Container } from "dockerode";
import { EvaluationHandler } from "../base/evaluation-handler";
import { debounce } from "../utils";

// Example route data
// [
//   {
//     "dst": "default",
//     "gateway": "192.168.1.1",
//     "dev": "wlp4s0",
//     "protocol": "dhcp",
//     "prefsrc": "192.168.1.35",
//     "metric": 600,
//     "flags": []
//   },
//   {
//     "dst": "172.17.0.0/16",
//     "dev": "docker0",
//     "protocol": "kernel",
//     "scope": "link",
//     "prefsrc": "172.17.0.1",
//     "flags": []
//   },
//   {
//     "dst": "172.18.0.0/16",
//     "dev": "br-074c2b609647",
//     "protocol": "kernel",
//     "scope": "link",
//     "prefsrc": "172.18.0.1",
//     "flags": []
//   },
//   {
//     "dst": "172.19.0.0/16",
//     "dev": "br-7d941c7c96dc",
//     "protocol": "kernel",
//     "scope": "link",
//     "prefsrc": "172.19.0.1",
//     "flags": []
//   },
//   {
//     "dst": "172.20.0.0/16",
//     "dev": "br-2d8c0f3b9667",
//     "protocol": "kernel",
//     "scope": "link",
//     "prefsrc": "172.20.0.1",
//     "flags": [
//       "linkdown"
//     ]
//   },
//   {
//     "dst": "172.21.0.0/16",
//     "dev": "br-4e5a36c754f8",
//     "protocol": "kernel",
//     "scope": "link",
//     "prefsrc": "172.21.0.1",
//     "flags": []
//   },
//   {
//     "dst": "172.22.0.0/16",
//     "dev": "br-27773d25c597",
//     "protocol": "kernel",
//     "scope": "link",
//     "prefsrc": "172.22.0.1",
//     "flags": [
//       "linkdown"
//     ]
//   },
//   {
//     "dst": "172.23.0.0/16",
//     "dev": "br-e64d2bb664b9",
//     "protocol": "kernel",
//     "scope": "link",
//     "prefsrc": "172.23.0.1",
//     "flags": [
//       "linkdown"
//     ]
//   },
//   {
//     "dst": "172.31.20.0/24",
//     "dev": "br-2fcbf06db28d",
//     "protocol": "kernel",
//     "scope": "link",
//     "prefsrc": "172.31.20.1",
//     "flags": []
//   },
//   {
//     "dst": "192.168.1.0/24",
//     "dev": "wlp4s0",
//     "protocol": "kernel",
//     "scope": "link",
//     "prefsrc": "192.168.1.35",
//     "metric": 600,
//     "flags": []
//   },
//   {
//     "dst": "192.168.122.0/24",
//     "dev": "virbr0",
//     "protocol": "kernel",
//     "scope": "link",
//     "prefsrc": "192.168.122.1",
//     "flags": [
//       "linkdown"
//     ]
//   }
// ]

const RouteNextHopSchema = t.Object(
	{
		gateway: t.Optional(t.String()),
		dev: t.Optional(t.String()),
		weight: t.Optional(t.Number()),
		flags: t.Optional(t.Array(t.String())),
	},
	{ additionalProperties: true },
);

const RouteEntrySchema = t.Object({
	dst: t.String({
		description: "Destination prefix (e.g., '192.168.1.0/24') or 'default'",
	}),
	type: t.Optional(
		t.String({
			description: "Route type (e.g., unicast, blackhole, unreachable)",
		}),
	),
	dev: t.Optional(
		t.String({ description: "Output device name (e.g., eth0, wlan0)" }),
	),
	gateway: t.Optional(t.String({ description: "Gateway IP address" })),
	protocol: t.Optional(
		t.Union([t.String(), t.Number()], {
			description: "Routing protocol (e.g., kernel, boot, static, dhcp)",
		}),
	),
	scope: t.Optional(
		t.Union([t.String(), t.Number()], {
			description: "Route scope (e.g., global, link, host)",
		}),
	),
	prefsrc: t.Optional(t.String({ description: "Preferred source IP address" })),
	metric: t.Optional(t.Number({ description: "Route metric/priority" })),
	flags: t.Optional(
		t.Array(t.String(), {
			description: "Route flags (e.g., onlink, pervasive)",
		}),
	),
	table: t.Optional(
		t.Union([t.String(), t.Number()], {
			description: "Routing table ID or name",
		}),
	),
	mtu: t.Optional(t.Number({ description: "Path MTU" })),
	window: t.Optional(t.Number({ description: "TCP window size" })),
	irtt: t.Optional(t.Number({ description: "Initial round trip time" })),
	weight: t.Optional(t.Number({ description: "Multipath route weight" })),
	nexthops: t.Optional(
		t.Array(RouteNextHopSchema, {
			description: "Next hops for multipath routes",
		}),
	),
	pref: t.Optional(
		t.String({ description: "IPv6 route preference (low, medium, high)" }),
	),
	expires: t.Optional(
		t.Number({ description: "Route expiration time in seconds" }),
	),
	nhid: t.Optional(t.Number({ description: "Nexthop ID" })),
	error: t.Optional(
		t.Number({ description: "Error code for unreachable routes" }),
	),
});

const IpRouteSchema = t.Array(RouteEntrySchema);

async function getRoutes(container: Container) {
	try {
		const exec = await container.exec({
			Cmd: ["ip", "-j", "route"],
			AttachStdout: true,
			AttachStderr: true,
			Tty: false,
		});

		return new Promise<typeof IpRouteSchema.static>((resolve, reject) => {
			exec.start(
				{ Detach: false, Tty: false },
				(err: Error | null, stream?: NodeJS.ReadableStream) => {
					if (err) return reject(err);
					if (!stream)
						return reject(new Error("No stream returned from exec.start"));

					let output = "";

					container.modem.demuxStream(
						stream,
						{
							write: (data) => {
								output += data.toString();
							},
						} as NodeJS.WritableStream,
						{
							write: (errData) => {
								console.error("Container Error:", errData.toString());
							},
						} as NodeJS.WritableStream,
					);

					stream.on("end", () => {
						try {
							resolve(JSON.parse(output));
						} catch (parseError) {
							reject(
								new Error(`Failed to parse ip route output: ${parseError}`),
							);
						}
					});
				},
			);
		});
	} catch (error) {
		if (
			error instanceof Error &&
			"statusCode" in error &&
			typeof error.statusCode === "number" &&
			[404, 409].includes(error.statusCode)
		) {
			return [];
		}
		throw error;
	}
}

export default new EvaluationHandler("linux")
	.kinds(["linux"])
	.withContext(async ({ node, docker }) => {
		const container = docker.getContainer(node.containerId);
		return { container };
	})
	.addSource({
		id: "routing",
		data: IpRouteSchema,
		listen: async ({ container, docker }, notify) => {
			const doUpdate = debounce(async () => {
				try {
					const data = await getRoutes(container);
					notify(data);
				} catch (error) {
					console.error("Failed to update routes:", error);
				}
			}, 500);

			try {
				const exec = await container.exec({
					Cmd: ["ip", "-o", "monitor", "route"],
					AttachStdout: true,
					AttachStderr: false,
					Tty: false,
				});

				const stream = new PassThrough();
				const rawStream = await exec.start({ Detach: false, Tty: false });
				docker.modem.demuxStream(rawStream, stream, process.stderr);

				const cleanup = () => {
					rawStream.destroy();
				};

				stream.on("data", async (chunk: Buffer) => {
					const text = chunk.toString();
					if (!text.trim()) return;
					if (text.includes("OCI runtime exec failed")) {
						return cleanup();
					}

					await doUpdate();
				});

				return cleanup;
			} catch (error) {
				if (
					error instanceof Error &&
					"statusCode" in error &&
					typeof error.statusCode === "number" &&
					[404, 409].includes(error.statusCode)
				) {
					return () => {};
				}
				throw error;
			}
		},
		read: async ({ container }) => {
			return await getRoutes(container);
		},
	})
	.addCheck({
		id: "route-exist",
		name: "Route Exist",
		text: "Should have route to {dst} through {gateway}",
		source: "routing",
		params: {
			dst: t.String({
				title: "Destination",
			}),
			gateway: t.String({
				title: "Gateway",
			}),
		},
		handler: (_, params, data) => {
			return data.some((route) => {
				return route.dst === params.dst && route.gateway === params.gateway;
			});
		},
	});
