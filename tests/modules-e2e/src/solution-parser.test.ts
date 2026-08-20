import { describe, expect, it } from "bun:test";
import {
	isReadOnly,
	parseSolution,
	tokenize,
	toRouterOSCall,
	toShellCommand,
} from "./solution-parser";

describe("tokenize", () => {
	it("splits on whitespace", () => {
		expect(tokenize("/ip address add address=1.1.1.1/24")).toEqual([
			"/ip",
			"address",
			"add",
			"address=1.1.1.1/24",
		]);
	});

	it("keeps quoted values intact", () => {
		expect(tokenize('/system identity set name="Lab R1"')).toEqual([
			"/system",
			"identity",
			"set",
			"name=Lab R1",
		]);
	});

	it("rejects an unterminated quote", () => {
		expect(() => tokenize('/system identity set name="Lab')).toThrow(
			/Unterminated quote/,
		);
	});
});

describe("toRouterOSCall", () => {
	it("maps a path with parameters", () => {
		expect(
			toRouterOSCall(
				"/ip address add address=192.168.10.1/24 interface=ether2",
			),
		).toEqual({
			path: "/ip/address/add",
			params: { address: "192.168.10.1/24", interface: "ether2" },
		});
	});

	it("maps a deep path", () => {
		expect(
			toRouterOSCall(
				"/ip firewall address-list add list=bgp-networks address=192.0.2.0/24",
			),
		).toEqual({
			path: "/ip/firewall/address-list/add",
			params: { list: "bgp-networks", address: "192.0.2.0/24" },
		});
	});

	it("preserves dotted parameter names used by BGP", () => {
		const call = toRouterOSCall(
			"/routing bgp connection add name=peer-R2 local.role=ebgp remote.as=65000",
		);
		expect(call.path).toBe("/routing/bgp/connection/add");
		expect(call.params["local.role"]).toBe("ebgp");
		expect(call.params["remote.as"]).toBe("65000");
	});

	it("maps a two-word set command", () => {
		expect(toRouterOSCall("/system identity set name=Lab-R1")).toEqual({
			path: "/system/identity/set",
			params: { name: "Lab-R1" },
		});
	});

	it("keeps comma-separated values as one parameter", () => {
		expect(
			toRouterOSCall("/routing rip instance add redistribute=connected,rip")
				.params.redistribute,
		).toBe("connected,rip");
	});

	it("rejects a command that does not start with a slash", () => {
		expect(() => toRouterOSCall("ip address add address=1.1.1.1")).toThrow(
			/must start with/,
		);
	});

	it("rejects a positional argument after parameters", () => {
		expect(() => toRouterOSCall("/interface set disabled=yes ether3")).toThrow(
			/Unsupported positional argument/,
		);
	});

	it("rejects a command with no action verb", () => {
		expect(() => toRouterOSCall("/ip")).toThrow(/Cannot derive an API path/);
	});
});

describe("isReadOnly", () => {
	it.each([
		["/ip address print", true],
		["/ip route print detail where dst-address=203.0.113.0/24", true],
		["/routing bgp session print", true],
		["/routing ospf neighbor print", true],
		["/ping 192.168.10.1 count=4", true],
		["/export", false], // bare "/export" has no path words to inspect
		["/ip address add address=192.168.10.1/24 interface=ether2", false],
		["/routing ospf instance add name=ospf-lab router-id=1.1.1.1", false],
	])("routeros %s -> %s", (command, expected) => {
		expect(isReadOnly("routeros", command)).toBe(expected);
	});

	it.each([
		["ping -c 4 192.168.20.2", true],
		["ip addr show eth1", true],
		["tracepath 192.168.20.2", true],
		["sudo ip addr add 192.168.10.2/24 dev eth1", false],
		["sudo ip link set eth1 up", false],
		["sudo ip route add default via 192.168.10.1", false],
		["sudo useradd siswa", false],
	])("shell %s -> %s", (command, expected) => {
		expect(isReadOnly("shell", command)).toBe(expected);
	});
});

describe("toShellCommand", () => {
	it("strips sudo", () => {
		expect(toShellCommand("sudo ip link set eth1 up")).toBe(
			"ip link set eth1 up",
		);
	});

	it("leaves other commands untouched", () => {
		expect(toShellCommand("ip link set eth1 up")).toBe("ip link set eth1 up");
	});
});

describe("parseSolution", () => {
	const doc = [
		"# Solusi",
		"",
		"## R1 (MikroTik RouterOS)",
		"",
		"1. **Konfigurasikan IP**",
		"   ```routeros",
		"   /ip address add address=192.168.10.1/24 interface=ether2",
		"   /ip address print",
		"   ```",
		"",
		"## PC1 (Ubuntu Linux)",
		"",
		"   ```bash",
		"   sudo ip link set eth1 up",
		"   ```",
		"",
		"## Verifikasi & Pengujian",
		"",
		"```bash",
		"ping -c 4 192.168.10.1",
		"```",
	].join("\n");

	it("attributes commands to the enclosing node section", () => {
		const { commands } = parseSolution(doc, ["R1", "PC1"]);
		expect(commands.map((c) => [c.node, c.kind, c.raw])).toEqual([
			[
				"R1",
				"routeros",
				"/ip address add address=192.168.10.1/24 interface=ether2",
			],
			["R1", "routeros", "/ip address print"],
			["PC1", "shell", "sudo ip link set eth1 up"],
		]);
	});

	it("flags read-only commands without dropping them", () => {
		const { commands } = parseSolution(doc, ["R1", "PC1"]);
		expect(commands.filter((c) => c.readOnly).map((c) => c.raw)).toEqual([
			"/ip address print",
		]);
	});

	it("ignores read-only commands in non-node sections", () => {
		const { orphans } = parseSolution(doc, ["R1", "PC1"]);
		expect(orphans).toEqual([]);
	});

	it("reports a mutating command outside any node section", () => {
		const stray = [
			"## Verifikasi",
			"```routeros",
			"/ip address add address=10.0.0.1/24 interface=ether5",
			"```",
		].join("\n");

		const { orphans } = parseSolution(stray, ["R1"]);
		expect(orphans).toHaveLength(1);
		expect(orphans[0]?.raw).toContain("/ip address add");
	});

	it("reports a fence with an unrecognised language", () => {
		const doc = [
			"## R1 (MikroTik RouterOS)",
			"```",
			"/ip address print",
			"```",
		];
		const { unknownFences } = parseSolution(doc.join("\n"), ["R1"]);
		expect(unknownFences).toHaveLength(1);
	});

	it("treats a heading for an unknown node as a prose section", () => {
		const { commands } = parseSolution(doc, ["PC1"]);
		expect(commands.every((c) => c.node === "PC1")).toBe(true);
	});
});

describe("toRouterOSCall with an item name", () => {
	it("maps a positional item to .id", () => {
		// "/ip service set telnet disabled=yes" changes the row named telnet;
		// "telnet" is not another level of menu path.
		expect(toRouterOSCall("/ip service set telnet disabled=yes")).toEqual({
			path: "/ip/service/set",
			params: { ".id": "telnet", disabled: "yes" },
		});
	});

	it("maps an item with no parameters", () => {
		expect(toRouterOSCall("/ip service disable telnet")).toEqual({
			path: "/ip/service/disable",
			params: { ".id": "telnet" },
		});
	});

	it("maps an interface toggle", () => {
		expect(toRouterOSCall("/interface set ether3 disabled=yes")).toEqual({
			path: "/interface/set",
			params: { ".id": "ether3", disabled: "yes" },
		});
	});

	it("still maps commands with no item name", () => {
		expect(
			toRouterOSCall("/system note set note=Halo show-at-login=yes"),
		).toEqual({
			path: "/system/note/set",
			params: { note: "Halo", "show-at-login": "yes" },
		});
	});

	it("rejects two item names", () => {
		expect(() => toRouterOSCall("/ip service set telnet ftp")).toThrow(
			/More than one item name/,
		);
	});

	it("rejects a command with no action verb", () => {
		expect(() => toRouterOSCall("/ip service telnet")).toThrow(
			/No RouterOS action verb/,
		);
	});
});
