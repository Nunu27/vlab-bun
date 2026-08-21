import type { DeviceTemplateResources } from "./schemas/device-template";

/**
 * Fallbacks for a template that declares neither a limit nor a cost. Only
 * reached when an admin has filled in nothing at all.
 */
export const DEFAULT_CPU_COST_CORES = 0.5;
export const DEFAULT_MEMORY_COST_MB = 512;

/**
 * Multipliers to MiB, matching how containerlab actually parses these strings:
 * bare b/k/m/g are decimal (10^3), and only the explicit *iB spellings are
 * binary. Verified against real deploys - `64Mb` becomes 64,000,000 bytes while
 * `64MiB` becomes 67,108,864. This is the opposite of the docker CLI's own
 * convention, so it is easy to get wrong.
 *
 * Everything downstream counts in MiB (`worker.memory_mb` comes from
 * `os.totalmem()`), so that is what these convert to.
 */
const MIB = 1024 * 1024;
const MEMORY_UNITS: Record<string, number> = {
	b: 1 / MIB,
	k: 1e3 / MIB,
	kb: 1e3 / MIB,
	kib: 1024 / MIB,
	m: 1e6 / MIB,
	mb: 1e6 / MIB,
	mib: 1,
	g: 1e9 / MIB,
	gb: 1e9 / MIB,
	gib: 1024,
};

/**
 * Parses a containerlab memory limit ("256Mb", "1G", "512MiB", or plain bytes)
 * into MiB. Returns null when there is no usable limit, which callers read as
 * "unlimited".
 */
export function parseMemoryLimitMB(
	value: string | null | undefined,
): number | null {
	if (!value) return null;

	const match = /^\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]*)\s*$/.exec(value);
	if (!match) return null;

	const amount = Number(match[1]);
	if (!Number.isFinite(amount) || amount <= 0) return null;

	// A bare number is bytes.
	const unit = (match[2] || "b").toLowerCase();
	const multiplier = MEMORY_UNITS[unit];
	if (multiplier === undefined) return null;

	const mb = amount * multiplier;
	return mb > 0 ? mb : null;
}

function positiveOrNull(value: number | null | undefined): number | null {
	return typeof value === "number" && value > 0 ? value : null;
}

export type ResolvedNodeCost = {
	cpuCostCores: number;
	memoryCostMB: number;
};

/**
 * Works out what a node should reserve on a worker.
 *
 * The container limit is the ceiling on what a node can ever consume, so it is
 * both the default cost and the cap on it. A declared cost above the limit is
 * not reachable — cgroups would kill the container first — and reserving for it
 * would silently waste cluster capacity, so it is clamped rather than trusted.
 *
 * A lab may override a template's resources per node, so the effective limit is
 * the override where present and the template's otherwise.
 */
export function resolveNodeCost(
	template: {
		resources: DeviceTemplateResources;
		cpuCostCores?: number | null;
		memoryCostMB?: number | null;
	},
	override?: DeviceTemplateResources | null,
): ResolvedNodeCost {
	const cpuLimit = override?.cpu ?? template.resources?.cpu ?? null;
	const memoryLimit = parseMemoryLimitMB(
		override?.memory ?? template.resources?.memory,
	);

	// A non-positive cost is not a reservation of nothing, it is a missing
	// value: `0 ?? limit` would otherwise be taken literally and let a node onto
	// a worker for free. The measurement returns 0 when it collects no samples,
	// so this is reachable from a failed template test, not just a typo.
	const declaredCpu = positiveOrNull(template.cpuCostCores);
	const declaredMemory = positiveOrNull(template.memoryCostMB);

	const cpuCost = declaredCpu ?? cpuLimit ?? DEFAULT_CPU_COST_CORES;
	const memoryCost = declaredMemory ?? memoryLimit ?? DEFAULT_MEMORY_COST_MB;

	return {
		cpuCostCores: cpuLimit ? Math.min(cpuCost, cpuLimit) : cpuCost,
		memoryCostMB: memoryLimit
			? Math.min(memoryCost, Math.ceil(memoryLimit))
			: memoryCost,
	};
}
