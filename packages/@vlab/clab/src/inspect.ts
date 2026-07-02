import type { ContainerlabInspectNode } from "./types";

export function parseInspectOutput(stdout: string): ContainerlabInspectNode[] {
	const data = JSON.parse(stdout) as unknown;
	const rows = Array.isArray(data)
		? data
		: isRecord(data)
			? Object.values(data).flatMap((value) =>
					Array.isArray(value) ? value : [],
				)
			: [];

	return rows.filter(isRecord).map((row) => ({
		labName: getString(row, "lab_name") ?? "",
		labPath: getString(row, "labPath"),
		absLabPath: getString(row, "absLabPath"),
		name: getString(row, "name") ?? "",
		containerId: getString(row, "container_id") ?? "",
		image: getString(row, "image") ?? "",
		kind: getString(row, "kind") ?? "",
		state: getString(row, "state") ?? "",
		status: getString(row, "status")?.replace("health: ", ""),
		ipv4Address: getString(row, "ipv4_address"),
		ipv6Address: getString(row, "ipv6_address"),
		owner: getString(row, "owner"),
		raw: row,
	}));
}

function getString(record: Record<string, unknown>, key: string) {
	const value = record[key];
	return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
