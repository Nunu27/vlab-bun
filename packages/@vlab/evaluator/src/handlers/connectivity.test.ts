import { describe, expect, test } from "bun:test";
import connectivity, {
	parsePingSuccess,
	type ReachabilitySchema,
	uniqueTargets,
} from "./connectivity";

// The ping check ignores ctx; a throwaway value is enough to invoke it.
const ctx = undefined as never;

describe("parsePingSuccess", () => {
	test("detects a successful probe", () => {
		const output = [
			"PING 192.168.20.2 (192.168.20.2) 56(84) bytes of data.",
			"64 bytes from 192.168.20.2: icmp_seq=1 ttl=62 time=1.23 ms",
			"",
			"--- 192.168.20.2 ping statistics ---",
			"1 packets transmitted, 1 received, 0% packet loss, time 0ms",
			"rtt min/avg/max/mdev = 1.230/1.230/1.230/0.000 ms",
		].join("\n");

		expect(parsePingSuccess(output)).toBe(true);
	});

	test("detects a timed-out probe", () => {
		const output = [
			"PING 192.168.20.2 (192.168.20.2) 56(84) bytes of data.",
			"",
			"--- 192.168.20.2 ping statistics ---",
			"1 packets transmitted, 0 received, 100% packet loss, time 0ms",
		].join("\n");

		expect(parsePingSuccess(output)).toBe(false);
	});

	test("treats an unreachable host as a failure", () => {
		// This form reports errors instead of loss, which is why the parser keys
		// off the received count rather than "0% packet loss".
		const output = [
			"PING 10.0.0.1 (10.0.0.1) 56(84) bytes of data.",
			"From 192.168.10.1 icmp_seq=1 Destination Net Unreachable",
			"",
			"--- 10.0.0.1 ping statistics ---",
			"1 packets transmitted, 0 received, +1 errors, 100% packet loss, time 0ms",
		].join("\n");

		expect(parsePingSuccess(output)).toBe(false);
	});

	test("handles the 'packets received' wording", () => {
		const output = "2 packets transmitted, 2 packets received, 0% packet loss";
		expect(parsePingSuccess(output)).toBe(true);
	});

	test("fails closed on unparseable output", () => {
		expect(parsePingSuccess("ping: connect: Network is unreachable")).toBe(
			false,
		);
		expect(parsePingSuccess("")).toBe(false);
	});
});

describe("uniqueTargets", () => {
	test("deduplicates targets across checks", () => {
		expect(
			uniqueTargets([
				{ target: "192.168.20.2" },
				{ target: "192.168.10.1" },
				{ target: "192.168.20.2" },
			]),
		).toEqual(["192.168.20.2", "192.168.10.1"]);
	});

	test("drops empty targets", () => {
		expect(uniqueTargets([{ target: "" }, { target: "10.0.0.1" }])).toEqual([
			"10.0.0.1",
		]);
	});

	test("returns nothing when no checks are bound", () => {
		expect(uniqueTargets([])).toEqual([]);
	});
});

describe("connectivity.ping", () => {
	const check = connectivity._checks.ping;

	const run = (
		params: { target: string },
		data: typeof ReachabilitySchema.static,
	) => check.handler(ctx, params, data) as boolean;

	test("passes when the target responded", () => {
		expect(run({ target: "192.168.20.2" }, { "192.168.20.2": true })).toBe(
			true,
		);
	});

	test("fails when the target did not respond", () => {
		expect(run({ target: "192.168.20.2" }, { "192.168.20.2": false })).toBe(
			false,
		);
	});

	test("fails when the target was never probed", () => {
		expect(run({ target: "192.168.20.2" }, {})).toBe(false);
	});
});
