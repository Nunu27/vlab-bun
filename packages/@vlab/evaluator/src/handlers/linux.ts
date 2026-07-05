import { PassThrough } from "node:stream";
import { Type as t } from "@sinclair/typebox";
import type { Container } from "dockerode";
import { EvaluationHandler } from "../base/evaluation-handler";
import { getModem, throttle } from "../utils";

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

const UserSchema = t.Array(
	t.Object({
		username: t.String(),
		uid: t.Number(),
		gid: t.Number(),
		home: t.String(),
		shell: t.String(),
	}),
);

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

async function getUsers(container: Container) {
	try {
		const exec = await container.exec({
			Cmd: ["cat", "/etc/passwd"],
			AttachStdout: true,
			AttachStderr: true,
			Tty: false,
		});

		return new Promise<typeof UserSchema.static>((resolve, reject) => {
			exec.start(
				{ Detach: false, Tty: false },
				(err: Error | null, stream?: NodeJS.ReadableStream) => {
					if (err) return reject(err);
					if (!stream)
						return reject(new Error("No stream returned from exec.start"));

					let output = "";
					const stdout = new PassThrough();
					const stderr = new PassThrough();

					getModem(container).demuxStream(stream, stdout, stderr);

					stdout.on("data", (chunk: Buffer) => {
						output += chunk.toString();
					});

					stderr.on("data", (chunk: Buffer) => {
						console.error("Container Error:", chunk.toString());
					});

					stream.on("end", () => {
						try {
							const users = output
								.split("\n")
								.map((line) => line.trim())
								.filter(Boolean)
								.map((line) => {
									const parts = line.split(":");
									return {
										username: parts[0] || "",
										uid: Number.parseInt(parts[2] || "0", 10),
										gid: Number.parseInt(parts[3] || "0", 10),
										home: parts[5] || "",
										shell: parts[6] || "",
									};
								});
							resolve(users);
						} catch (parseError) {
							reject(new Error(`Failed to parse passwd output: ${parseError}`));
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
					const stdout = new PassThrough();
					const stderr = new PassThrough();

					getModem(container).demuxStream(stream, stdout, stderr);

					stdout.on("data", (chunk: Buffer) => {
						output += chunk.toString();
					});

					stderr.on("data", (chunk: Buffer) => {
						console.error("Container Error:", chunk.toString());
					});

					stream.on("end", () => {
						try {
							resolve(JSON.parse(output));
						} catch (parseError) {
							reject(parseError);
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
		const container = docker.getContainer(node.id);
		return { container };
	})
	.addSource({
		id: "routing",
		data: IpRouteSchema,
		listen: async ({ container, docker }, { notify, reportError }) => {
			const doUpdate = throttle(async () => {
				try {
					const data = await getRoutes(container);
					notify(data);
				} catch (error) {
					reportError(error);
				}
			}, 100);

			try {
				const exec = await container.exec({
					Cmd: ["ip", "-o", "monitor", "route"],
					AttachStdout: true,
					AttachStderr: true,
					Tty: false,
				});

				const stdout = new PassThrough();
				const stderr = new PassThrough();
				const rawStream = await exec.start({ Detach: false, Tty: false });
				docker.modem.demuxStream(rawStream, stdout, stderr);

				let closed = false;
				const cleanup = () => {
					closed = true;
					rawStream.destroy();
				};

				stdout.on("data", async (chunk: Buffer) => {
					const text = chunk.toString();
					if (!text.trim()) return;
					await doUpdate();
				});

				stderr.on("data", (chunk: Buffer) => {
					const text = chunk.toString();
					if (text.includes("OCI runtime exec failed")) {
						if (!closed) reportError(new Error(text));
					} else {
						console.error("Routing Monitor Error:", text);
					}
				});

				rawStream.on("error", (error) => {
					if (!closed) reportError(error);
				});
				rawStream.on("close", () => {
					if (!closed) reportError(new Error("Routing monitor stream closed"));
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
		text: "Route to {dst} via {gateway} should be configured",
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
	})
	.addSource({
		id: "users",
		data: UserSchema,
		listen: async ({ container, docker }, { notify, reportError }) => {
			const doUpdate = throttle(async () => {
				try {
					const data = await getUsers(container);
					notify(data);
				} catch (error) {
					reportError(error);
				}
			}, 100);

			try {
				const exec = await container.exec({
					Cmd: [
						"sh",
						"-c",
						"inotifywait -m -q -e close_write,moved_to,modify --format '%f' /etc | grep --line-buffered '^passwd$'",
					],
					AttachStdout: true,
					AttachStderr: true,
					Tty: false,
				});

				const stdout = new PassThrough();
				const stderr = new PassThrough();
				const rawStream = await exec.start({ Detach: false, Tty: false });
				docker.modem.demuxStream(rawStream, stdout, stderr);

				let closed = false;
				const cleanup = () => {
					closed = true;
					rawStream.destroy();
				};

				stdout.on("data", async (chunk: Buffer) => {
					const text = chunk.toString();
					if (!text.trim()) return;
					await doUpdate();
				});

				stderr.on("data", (chunk: Buffer) => {
					const text = chunk.toString();
					if (text.includes("OCI runtime exec failed")) {
						if (!closed) reportError(new Error(text));
					} else {
						console.error("Users Monitor Error:", text);
					}
				});

				rawStream.on("error", (error) => {
					if (!closed) reportError(error);
				});
				rawStream.on("close", () => {
					if (!closed) reportError(new Error("Users monitor stream closed"));
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
			return await getUsers(container);
		},
	})
	.addCheck({
		id: "user-exist",
		name: "User Exist",
		text: "User '{username}' should exist",
		source: "users",
		params: {
			username: t.String({
				title: "Username",
			}),
		},
		handler: (_, params, data) => {
			return data.some((user) => user.username === params.username);
		},
	});
