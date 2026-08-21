import { parseMemoryLimitMB } from "@vlab/shared/resource-cost";
import type { DeviceTemplateResources } from "@vlab/shared/schemas/device-template";

type CostFields = {
	resources: DeviceTemplateResources;
	cpuCostCores?: number | null;
	memoryCostMB?: number | null;
};

/**
 * A cost above the container limit describes a state the node can never reach:
 * cgroups would kill it first. Reserving for it only wastes cluster capacity,
 * so it is rejected here rather than silently clamped, which would leave the
 * admin looking at a number the scheduler is not using.
 */
export function validateTemplateCost(body: CostFields): string | null {
	const memoryLimit = parseMemoryLimitMB(body.resources?.memory);
	const cpuLimit = body.resources?.cpu ?? null;

	// Reserving nothing would let unlimited labs onto a worker. Leaving the
	// field empty is the way to say "use the limit"; zero is not.
	if (body.memoryCostMB != null && body.memoryCostMB <= 0) {
		return "Memory cost must be greater than 0. Leave it empty to reserve the memory limit instead.";
	}

	if (body.cpuCostCores != null && body.cpuCostCores <= 0) {
		return "CPU cost must be greater than 0. Leave it empty to reserve the CPU limit instead.";
	}

	if (
		body.memoryCostMB != null &&
		memoryLimit != null &&
		body.memoryCostMB > memoryLimit
	) {
		return `Memory cost (${body.memoryCostMB} MB) cannot exceed the memory limit (${Math.floor(memoryLimit)} MB). The container can never use more than its limit.`;
	}

	if (
		body.cpuCostCores != null &&
		cpuLimit != null &&
		body.cpuCostCores > cpuLimit
	) {
		return `CPU cost (${body.cpuCostCores} cores) cannot exceed the CPU limit (${cpuLimit} cores). The container can never use more than its limit.`;
	}

	return null;
}
