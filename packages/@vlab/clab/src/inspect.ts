import type { ContainerlabInspectNode } from "./types";

export function parseInspectOutput(stdout: string): ContainerlabInspectNode[] {
	const data = JSON.parse(stdout) as unknown;
	if (!isRecord(data)) return [];

	const rows: ContainerlabInspectNode[] = [];

	for (const [labName, nodes] of Object.entries(data)) {
		if (!Array.isArray(nodes)) continue;

		for (const node of nodes) {
			if (!isRecord(node)) continue;

			const labels = isRecord(node.Labels) ? node.Labels : {};
			const networkSettings = isRecord(node.NetworkSettings)
				? node.NetworkSettings
				: {};
			const topoFile = getString(labels, "clab-topo-file");

			rows.push({
				labName,
				labPath: topoFile,
				absLabPath: topoFile,
				name: getString(labels, "clab-node-name") ?? "",
				containerId: getString(node, "ID") ?? "",
				image: getString(node, "Image") ?? "",
				kind: getString(labels, "clab-node-kind") ?? "",
				state: getString(node, "State") ?? "",
				status: extractHealthStatus(getString(node, "Status")),
				ipv4Address: formatAddress(
					getString(networkSettings, "IPv4addr"),
					getNumber(networkSettings, "IPv4pLen"),
				),
				ipv6Address: formatAddress(
					getString(networkSettings, "IPv6addr"),
					getNumber(networkSettings, "IPv6pLen"),
				),
				owner: getString(labels, "clab-owner"),
				raw: node,
			});
		}
	}

	return rows;
}

function extractHealthStatus(status: string | undefined): string | null {
	const match = status?.match(/\(([^)]+)\)\s*$/);
	return match?.[1]?.replace(/^health:\s*/, "") ?? null;
}

function formatAddress(address: string | undefined, prefixLength?: number) {
	if (!address) return undefined;
	return prefixLength !== undefined ? `${address}/${prefixLength}` : address;
}

function getString(record: Record<string, unknown>, key: string) {
	const value = record[key];
	return typeof value === "string" ? value : undefined;
}

function getNumber(record: Record<string, unknown>, key: string) {
	const value = record[key];
	return typeof value === "number" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
