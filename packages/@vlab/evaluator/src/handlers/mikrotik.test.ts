import { describe, expect, test } from "bun:test";
import mikrotik, {
	type BGPConnectionSchema,
	type BGPInstanceSchema,
	type BGPSessionSchema,
	gatewayMatches,
	type IPRouteSchema,
	type IPServiceSchema,
	type OSPFAreaSchema,
	type OSPFInstanceSchema,
	type OSPFInterfaceTemplateSchema,
	type OSPFNeighborSchema,
	type RIPInstanceSchema,
	type RIPInterfaceTemplateSchema,
	type SystemIdentitySchema,
	type SystemNoteSchema,
	type UserSchema,
} from "./mikrotik";

// Check handlers only read `ctx` when they need the RouterOS client; every
// mikrotik check ignores it, so a throwaway value is enough to invoke them.
const ctx = undefined as never;

describe("mikrotik route-exist check", () => {
	const { handler } = mikrotik._checks["route-exist"];
	const routes: typeof IPRouteSchema.static = [
		{
			"dst-address": "10.0.0.0/24",
			gateway: "10.0.0.1",
			dynamic: "false",
			disabled: "false",
			inactive: "false",
			active: "true",
			connect: "false",
			static: "true",
			rip: "false",
			bgp: "false",
			ospf: "false",
			"is-is": "false",
			dhcp: "false",
			vpn: "false",
			modem: "false",
			"bgp-mpls-vpn": "false",
			"hw-offloaded": "false",
			ecmp: "false",
		},
	];

	test("matches an active static route when the active flag is requested", () => {
		expect(
			handler(
				ctx,
				{ dst: "10.0.0.0/24", gateway: "10.0.0.1", flag: "As" },
				routes,
			),
		).toBe(true);
	});

	test("without an explicit 'A' flag, an active route does not match (compareFlag quirk)", () => {
		// route-exist defaults flag to an empty set, and compareFlag requires
		// route.active === "false" whenever "A" isn't in params.flag. So a
		// currently-active route only matches once the caller passes flag: "A".
		expect(
			handler(ctx, { dst: "10.0.0.0/24", gateway: "10.0.0.1" }, routes),
		).toBe(false);
	});

	test("does not match when the gateway differs", () => {
		expect(
			handler(
				ctx,
				{ dst: "10.0.0.0/24", gateway: "10.0.0.2", flag: "As" },
				routes,
			),
		).toBe(false);
	});
});

describe("mikrotik ospf-instance-exist check", () => {
	const { handler } = mikrotik._checks["ospf-instance-exist"];
	const instances: typeof OSPFInstanceSchema.static = [
		{
			".id": "*0",
			name: "inst1",
			version: "2",
			vrf: "main",
			"router-id": "2.2.2.2",
			disabled: "false",
			inactive: "false",
		},
	];

	test("matches an enabled instance by name and router id", () => {
		expect(
			handler(ctx, { name: "inst1", routerId: "2.2.2.2" }, instances),
		).toBe(true);
	});

	test("does not match the wrong router id", () => {
		expect(
			handler(ctx, { name: "inst1", routerId: "9.9.9.9" }, instances),
		).toBe(false);
	});

	test("respects an explicit version param", () => {
		expect(
			handler(
				ctx,
				{ name: "inst1", routerId: "2.2.2.2", version: "3" },
				instances,
			),
		).toBe(false);
	});
});

describe("mikrotik ospf-area-exist check", () => {
	const { handler } = mikrotik._checks["ospf-area-exist"];
	const areas: typeof OSPFAreaSchema.static = [
		{
			".id": "*1",
			name: "backbone1",
			instance: "inst1",
			"area-id": "0.0.0.0",
			type: "default",
			disabled: "false",
			inactive: "false",
			dynamic: "false",
			"transit-capable": "false",
		},
	];

	test("matches an area by name, instance, and area id", () => {
		expect(
			handler(
				ctx,
				{ name: "backbone1", instance: "inst1", areaId: "0.0.0.0" },
				areas,
			),
		).toBe(true);
	});

	test("does not match a mismatched instance", () => {
		expect(
			handler(
				ctx,
				{ name: "backbone1", instance: "inst2", areaId: "0.0.0.0" },
				areas,
			),
		).toBe(false);
	});
});

describe("mikrotik ospf-interface-template-exist check", () => {
	const { handler } = mikrotik._checks["ospf-interface-template-exist"];
	const templates: typeof OSPFInterfaceTemplateSchema.static = [
		{
			".id": "*1",
			".nextid": "*1",
			area: "backbone1",
			interfaces: "ether1,ether2",
			"instance-id": "0",
			type: "broadcast",
			"retransmit-interval": "5",
			"transmit-delay": "1",
			"hello-interval": "10",
			"dead-interval": "40",
			priority: "1",
			cost: "1",
			passive: "false",
			disabled: "false",
			inactive: "false",
		},
	];

	test("matches when the interface is included in the template's interface list", () => {
		expect(
			handler(ctx, { interfaces: "ether1", area: "backbone1" }, templates),
		).toBe(true);
	});

	test("does not match an interface outside the template's list", () => {
		expect(
			handler(ctx, { interfaces: "ether9", area: "backbone1" }, templates),
		).toBe(false);
	});

	test("passive: 'no' matches a template with passive=false", () => {
		expect(
			handler(
				ctx,
				{ interfaces: "ether1", area: "backbone1", passive: "no" },
				templates,
			),
		).toBe(true);
	});

	test("passive: 'yes' does not match a template with passive=false", () => {
		expect(
			handler(
				ctx,
				{ interfaces: "ether1", area: "backbone1", passive: "yes" },
				templates,
			),
		).toBe(false);
	});
});

describe("mikrotik ospf-neighbor-exist check", () => {
	const { handler } = mikrotik._checks["ospf-neighbor-exist"];
	const neighbors: typeof OSPFNeighborSchema.static = [
		{
			".id": "*1",
			instance: "inst1",
			area: "0.0.0.0",
			interface: "ether1",
			address: "10.0.0.2",
			priority: "1",
			"router-id": "3.3.3.3",
			dr: "10.0.0.1",
			bdr: "0.0.0.0",
			state: "Full",
			"state-changes": "1",
			adjacency: "00:01:00",
			timeout: "00:00:35",
		},
	];

	test("matches a neighbor by interface and state", () => {
		expect(
			handler(ctx, { interface: "ether1", state: "Full" }, neighbors),
		).toBe(true);
	});

	test("does not match a mismatched state", () => {
		expect(
			handler(ctx, { interface: "ether1", state: "Down" }, neighbors),
		).toBe(false);
	});
});

describe("mikrotik rip-instance-exist check", () => {
	const { handler } = mikrotik._checks["rip-instance-exist"];
	const instances: typeof RIPInstanceSchema.static = [
		{
			".id": "*1",
			name: "rip1",
			redistribute: "connected,static",
			disabled: "false",
		},
	];

	test("matches an enabled instance by name", () => {
		expect(handler(ctx, { name: "rip1" }, instances)).toBe(true);
	});

	test("respects an explicit redistribute param", () => {
		expect(
			handler(ctx, { name: "rip1", redistribute: "static" }, instances),
		).toBe(false);
	});
});

describe("mikrotik rip-interface-template-exist check", () => {
	const { handler } = mikrotik._checks["rip-interface-template-exist"];
	const templates: typeof RIPInterfaceTemplateSchema.static = [
		{ ".id": "*1", instance: "rip1", interfaces: "ether1", disabled: "false" },
	];

	test("matches by exact instance and interface name", () => {
		expect(
			handler(ctx, { instance: "rip1", interfaces: "ether1" }, templates),
		).toBe(true);
	});

	test("requires an exact interface match (no substring matching)", () => {
		expect(
			handler(ctx, { instance: "rip1", interfaces: "ether" }, templates),
		).toBe(false);
	});
});

describe("mikrotik bgp-instance-exist check", () => {
	const { handler } = mikrotik._checks["bgp-instance-exist"];
	const instances: typeof BGPInstanceSchema.static = [
		{
			".id": "*1",
			name: "default",
			"router-id": "4.4.4.4",
			as: "65000",
			disabled: "false",
			inactive: "false",
		},
	];

	test("matches by name, AS, and router id", () => {
		expect(
			handler(
				ctx,
				{ name: "default", as: "65000", routerId: "4.4.4.4" },
				instances,
			),
		).toBe(true);
	});

	test("does not match a mismatched AS", () => {
		expect(
			handler(
				ctx,
				{ name: "default", as: "65001", routerId: "4.4.4.4" },
				instances,
			),
		).toBe(false);
	});
});

describe("mikrotik bgp-connection-exist check", () => {
	const { handler } = mikrotik._checks["bgp-connection-exist"];
	const connections: typeof BGPConnectionSchema.static = [
		{
			".id": "*1",
			name: "peer1",
			"local.role": "ibgp",
			"remote.as": "65001",
			as: "65000",
			"output.redistribute": "connected",
			disabled: "false",
			inactive: "false",
		},
	];

	test("matches by name alone when optional params are omitted", () => {
		expect(handler(ctx, { name: "peer1" }, connections)).toBe(true);
	});

	test("does not match when an optional param is provided but wrong", () => {
		expect(
			handler(ctx, { name: "peer1", "remote.as": "65099" }, connections),
		).toBe(false);
	});
});

describe("mikrotik bgp-session-established check", () => {
	const { handler } = mikrotik._checks["bgp-session-established"];
	const sessions: typeof BGPSessionSchema.static = [
		{
			".id": "*1",
			name: "peer1",
			"remote.address": "10.0.0.2",
			state: "established",
			established: "true",
		},
		{
			".id": "*2",
			name: "peer2",
			"remote.address": "10.0.0.3",
			state: "idle",
			established: "false",
		},
		{
			".id": "*3",
			name: "peer3",
			"remote.address": "10.0.0.4",
			state: "Established",
		},
	];

	test("matches a session with established: 'true'", () => {
		expect(handler(ctx, { "remote.address": "10.0.0.2" }, sessions)).toBe(true);
	});

	test("does not match a non-established session", () => {
		expect(handler(ctx, { "remote.address": "10.0.0.3" }, sessions)).toBe(
			false,
		);
	});

	test("falls back to a case-insensitive state check when 'established' is absent", () => {
		expect(handler(ctx, { "remote.address": "10.0.0.4" }, sessions)).toBe(true);
	});
});

describe("mikrotik system-identity check", () => {
	const { handler } = mikrotik._checks["system-identity"];
	const identity: typeof SystemIdentitySchema.static = [{ name: "R1" }];

	test("matches the configured identity", () => {
		expect(handler(ctx, { name: "R1" }, identity)).toBe(true);
	});

	test("does not match a different identity", () => {
		expect(handler(ctx, { name: "R2" }, identity)).toBe(false);
	});

	test("does not match when no identity is reported", () => {
		expect(handler(ctx, { name: "R1" }, [])).toBe(false);
	});
});

describe("mikrotik user-exist check", () => {
	const { handler } = mikrotik._checks["user-exist"];
	const users: typeof UserSchema.static = [
		{ name: "admin", group: "full" },
		{ name: "student1", group: "read" },
	];

	test("matches an existing user", () => {
		expect(handler(ctx, { username: "student1" }, users)).toBe(true);
	});

	test("does not match a missing user", () => {
		expect(handler(ctx, { username: "guest" }, users)).toBe(false);
	});
});

describe("gatewayMatches", () => {
	test("matches a bare next-hop, as static routes report it", () => {
		expect(gatewayMatches("10.10.10.2", "10.10.10.2")).toBe(true);
	});

	test("matches a next-hop qualified with the resolved interface", () => {
		// OSPF and BGP routes come back as "<address>%<interface>".
		expect(gatewayMatches("10.10.10.2%ether3", "10.10.10.2")).toBe(true);
	});

	test("still rejects a different next-hop on the same interface", () => {
		expect(gatewayMatches("10.10.30.2%ether4", "10.10.10.2")).toBe(false);
	});

	test("handles a connected route, where the gateway is an interface name", () => {
		expect(gatewayMatches("ether2", "ether2")).toBe(true);
		expect(gatewayMatches("ether2", "10.10.10.2")).toBe(false);
	});
});

describe("mikrotik.system-note", () => {
	const check = mikrotik._checks["system-note"];
	const run = (
		params: { note: string; showAtLogin?: string },
		data: typeof SystemNoteSchema.static,
	) => check.handler(ctx, params, data) as boolean;

	// RouterOS reports show-at-login as "true"/"false" even though it is set
	// with yes/no, so the check has to bridge the two spellings.
	const banner: typeof SystemNoteSchema.static = [
		{ note: "Lab Jaringan", "show-at-login": "true" },
	];

	test("passes when the banner text matches", () => {
		expect(run({ note: "Lab Jaringan" }, banner)).toBe(true);
	});

	test("fails on different banner text", () => {
		expect(run({ note: "Salah" }, banner)).toBe(false);
	});

	test("checks show-at-login when asked", () => {
		expect(run({ note: "Lab Jaringan", showAtLogin: "yes" }, banner)).toBe(
			true,
		);
		expect(run({ note: "Lab Jaringan", showAtLogin: "no" }, banner)).toBe(
			false,
		);
	});

	test("treats a banner that is not shown at login as disabled", () => {
		const hidden = [{ note: "Lab Jaringan", "show-at-login": "false" }];
		expect(run({ note: "Lab Jaringan", showAtLogin: "yes" }, hidden)).toBe(
			false,
		);
		expect(run({ note: "Lab Jaringan", showAtLogin: "no" }, hidden)).toBe(true);
	});

	test("fails when no note is configured", () => {
		expect(run({ note: "Lab Jaringan" }, [])).toBe(false);
	});
});

describe("mikrotik.ip-service", () => {
	const check = mikrotik._checks["ip-service"];
	const run = (
		params: { name: string; disabled: string },
		data: typeof IPServiceSchema.static,
	) => check.handler(ctx, params, data) as boolean;

	const services: typeof IPServiceSchema.static = [
		{ ".id": "*0", name: "telnet", disabled: "true" },
		{ ".id": "*2", name: "ssh", disabled: "false" },
	];

	test("passes when a service is disabled as required", () => {
		expect(run({ name: "telnet", disabled: "yes" }, services)).toBe(true);
	});

	test("passes when a service is left enabled as required", () => {
		expect(run({ name: "ssh", disabled: "no" }, services)).toBe(true);
	});

	test("fails when a service that should be off is still on", () => {
		expect(run({ name: "ssh", disabled: "yes" }, services)).toBe(false);
	});

	test("fails when the service does not exist", () => {
		expect(run({ name: "ftp", disabled: "yes" }, services)).toBe(false);
	});
});

describe("mikrotik.user-exist group", () => {
	const check = mikrotik._checks["user-exist"];
	const run = (
		params: { username: string; group?: string },
		data: typeof UserSchema.static,
	) => check.handler(ctx, params, data) as boolean;

	const users: typeof UserSchema.static = [
		{ name: "admin", group: "full" },
		{ name: "siswa", group: "read" },
	];

	test("still matches on username alone", () => {
		expect(run({ username: "siswa" }, users)).toBe(true);
	});

	test("matches when the group also matches", () => {
		expect(run({ username: "siswa", group: "read" }, users)).toBe(true);
	});

	test("fails when the user exists but in the wrong group", () => {
		expect(run({ username: "siswa", group: "full" }, users)).toBe(false);
	});
});
