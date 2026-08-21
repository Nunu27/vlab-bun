import { describe, expect, test } from "bun:test";
import {
	DEFAULT_CPU_COST_CORES,
	DEFAULT_MEMORY_COST_MB,
	parseMemoryLimitMB,
	resolveNodeCost,
} from "./resource-cost";

describe("parseMemoryLimitMB", () => {
	// Ground truth from real containerlab deploys: bare b/k/m/g are decimal and
	// only *iB is binary, which is the opposite of the docker CLI convention.
	test("bare suffixes are decimal", () => {
		expect(parseMemoryLimitMB("64Mb")).toBeCloseTo(61.035, 2);
		expect(parseMemoryLimitMB("64MB")).toBeCloseTo(61.035, 2);
		expect(parseMemoryLimitMB("64m")).toBeCloseTo(61.035, 2);
		expect(parseMemoryLimitMB("1G")).toBeCloseTo(953.674, 2);
		expect(parseMemoryLimitMB("65536k")).toBeCloseTo(62.5, 2);
	});

	test("the *iB spellings are binary", () => {
		expect(parseMemoryLimitMB("64MiB")).toBe(64);
		expect(parseMemoryLimitMB("64mib")).toBe(64);
		expect(parseMemoryLimitMB("1GiB")).toBe(1024);
	});

	test("treats a bare number as bytes", () => {
		expect(parseMemoryLimitMB(String(64 * 1024 * 1024))).toBe(64);
	});

	test("returns null when there is no usable limit", () => {
		expect(parseMemoryLimitMB(undefined)).toBeNull();
		expect(parseMemoryLimitMB(null)).toBeNull();
		expect(parseMemoryLimitMB("")).toBeNull();
		expect(parseMemoryLimitMB("0Mb")).toBeNull();
		expect(parseMemoryLimitMB("lots")).toBeNull();
		expect(parseMemoryLimitMB("256TB")).toBeNull();
	});
});

describe("resolveNodeCost", () => {
	test("defaults the cost to the container limit", () => {
		expect(
			resolveNodeCost({ resources: { cpu: 0.5, memory: "256MiB" } }),
		).toEqual({ cpuCostCores: 0.5, memoryCostMB: 256 });
	});

	test("clamps a cost that exceeds the limit, which is unreachable", () => {
		// The RouterOS template shipped with cpu limit 0.3 but cost 0.5.
		expect(
			resolveNodeCost({
				resources: { cpu: 0.3, memory: "256MiB" },
				cpuCostCores: 0.5,
				memoryCostMB: 1024,
			}),
		).toEqual({ cpuCostCores: 0.3, memoryCostMB: 256 });
	});

	test("keeps a declared cost below the limit", () => {
		expect(
			resolveNodeCost({
				resources: { cpu: 1, memory: "512MiB" },
				cpuCostCores: 0.25,
				memoryCostMB: 128,
			}),
		).toEqual({ cpuCostCores: 0.25, memoryCostMB: 128 });
	});

	test("falls back to the defaults when nothing is declared", () => {
		expect(resolveNodeCost({ resources: {} })).toEqual({
			cpuCostCores: DEFAULT_CPU_COST_CORES,
			memoryCostMB: DEFAULT_MEMORY_COST_MB,
		});
	});

	test("a lab's per-node override replaces the template limit", () => {
		const template = {
			resources: { cpu: 0.5, memory: "256MiB" },
			cpuCostCores: 0.5,
			memoryCostMB: 256,
		};

		// Raising the override raises what the node may use, but the declared
		// cost still governs when it is lower.
		expect(resolveNodeCost(template, { cpu: 2, memory: "1GiB" })).toEqual({
			cpuCostCores: 0.5,
			memoryCostMB: 256,
		});

		// Lowering it caps the reservation: the node cannot exceed the override.
		expect(resolveNodeCost(template, { cpu: 0.2, memory: "128MiB" })).toEqual({
			cpuCostCores: 0.2,
			memoryCostMB: 128,
		});
	});

	test("a zero cost is treated as absent, not as a free node", () => {
		// The measurement returns 0 when it collects no samples, so this is
		// reachable from a failed template test rather than only from a typo.
		expect(
			resolveNodeCost({
				resources: { cpu: 0.3, memory: "256MiB" },
				cpuCostCores: 0,
				memoryCostMB: 0,
			}),
		).toEqual({ cpuCostCores: 0.3, memoryCostMB: 256 });

		// With no limit either, it falls all the way back to the defaults rather
		// than admitting the node for free.
		expect(
			resolveNodeCost({ resources: {}, cpuCostCores: 0, memoryCostMB: 0 }),
		).toEqual({
			cpuCostCores: DEFAULT_CPU_COST_CORES,
			memoryCostMB: DEFAULT_MEMORY_COST_MB,
		});
	});

	test("an unlimited node keeps its declared cost", () => {
		expect(
			resolveNodeCost({
				resources: {},
				cpuCostCores: 0.1,
				memoryCostMB: 64,
			}),
		).toEqual({ cpuCostCores: 0.1, memoryCostMB: 64 });
	});
});
