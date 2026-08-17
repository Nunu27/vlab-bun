import { describe, expect, test } from "bun:test";
import linux, {
	type IpRouteSchema,
	parsePasswd,
	type UserSchema,
} from "./linux";

// Check handlers only read `ctx` when they need docker/RouterOS access; all
// linux checks ignore it, so a throwaway value is enough to invoke them.
const ctx = undefined as never;

describe("parsePasswd", () => {
	test("parses standard /etc/passwd lines", () => {
		const output = [
			"root:x:0:0:root:/root:/bin/bash",
			"daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
		].join("\n");

		expect(parsePasswd(output)).toEqual([
			{ username: "root", uid: 0, gid: 0, home: "/root", shell: "/bin/bash" },
			{
				username: "daemon",
				uid: 1,
				gid: 1,
				home: "/usr/sbin",
				shell: "/usr/sbin/nologin",
			},
		]);
	});

	test("ignores blank and trailing-newline lines", () => {
		const output = "\nroot:x:0:0:root:/root:/bin/bash\n\n";
		expect(parsePasswd(output)).toEqual([
			{ username: "root", uid: 0, gid: 0, home: "/root", shell: "/bin/bash" },
		]);
	});

	test("returns an empty list for empty output", () => {
		expect(parsePasswd("")).toEqual([]);
	});

	test("defaults missing fields for malformed lines instead of throwing", () => {
		expect(parsePasswd("incomplete-line")).toEqual([
			{ username: "incomplete-line", uid: 0, gid: 0, home: "", shell: "" },
		]);
	});
});

describe("linux route-exist check", () => {
	const { handler } = linux._checks["route-exist"];
	const routes: typeof IpRouteSchema.static = [
		{
			dst: "10.0.0.0/24",
			gateway: "10.0.0.1",
			dev: "eth0",
			protocol: "static",
		},
		{ dst: "default", gateway: "192.168.1.1", dev: "eth1" },
	];

	test("matches when destination and gateway are both configured", () => {
		expect(
			handler(ctx, { dst: "10.0.0.0/24", gateway: "10.0.0.1" }, routes),
		).toBe(true);
	});

	test("does not match when the gateway differs", () => {
		expect(
			handler(ctx, { dst: "10.0.0.0/24", gateway: "10.0.0.2" }, routes),
		).toBe(false);
	});

	test("does not match an unconfigured destination", () => {
		expect(
			handler(ctx, { dst: "172.16.0.0/24", gateway: "10.0.0.1" }, routes),
		).toBe(false);
	});
});

describe("linux user-exist check", () => {
	const { handler } = linux._checks["user-exist"];
	const users: typeof UserSchema.static = [
		{ username: "root", uid: 0, gid: 0, home: "/root", shell: "/bin/bash" },
		{
			username: "student",
			uid: 1000,
			gid: 1000,
			home: "/home/student",
			shell: "/bin/bash",
		},
	];

	test("matches an existing user", () => {
		expect(handler(ctx, { username: "student" }, users)).toBe(true);
	});

	test("does not match a missing user", () => {
		expect(handler(ctx, { username: "guest" }, users)).toBe(false);
	});
});
