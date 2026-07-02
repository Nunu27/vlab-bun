import type { ContainerInfo } from "dockerode";
import { CLAB_BUILT_IN_LABELS } from "./types";

export const healthyStatus = new Set([null, "none", "healthy"]);

export function isKey<T extends object>(
	key: PropertyKey,
	obj: T,
): key is keyof T {
	return key in obj;
}

export function extractManagementIp(
	networkSettings: ContainerInfo["NetworkSettings"],
) {
	const networks = networkSettings?.Networks;
	if (!networks) return null;

	const keys = Object.keys(networks);
	if (keys.length === 0) return null;

	for (const [key, network] of Object.entries(networks)) {
		if (
			network.IPAddress &&
			(key.includes("clab") || key === "bridge" || key === "management")
		) {
			return network.IPAddress;
		}
	}

	for (const network of Object.values(networks)) {
		if (network.IPAddress) return network.IPAddress;
	}

	return null;
}

export function removeItemFromArray<T>(arr: T[], item: T) {
	const index = arr.indexOf(item);
	removeItemFromArrayByIndex(arr, index);
}

export function removeItemFromArrayByIndex<T>(arr: T[], index: number) {
	const lastItem = arr.at(-1);
	if (index < 0 || index >= arr.length || !lastItem) return;

	arr[index] = lastItem;
	arr.pop();
}

export interface ResolvedNode {
	id: string;
	name: string;
	deviceKind: string;
}

export interface NodeCredentials {
	username: string;
	password: string;
}

// Containerlab launches vrnetlab-backed kinds (e.g. mikrotik_ros) with the
// resolved node credentials injected as USERNAME/PASSWORD env vars, falling
// back to the RouterOS default (admin/admin) when the topology doesn't
// override them.
export function extractCredentials(
	env: string[] | undefined,
	fallback: NodeCredentials = { username: "admin", password: "admin" },
): NodeCredentials {
	const vars: Record<string, string> = {};

	for (const entry of env ?? []) {
		const index = entry.indexOf("=");
		if (index === -1) continue;
		vars[entry.slice(0, index)] = entry.slice(index + 1);
	}

	return {
		username: vars.USERNAME || fallback.username,
		password: vars.PASSWORD || fallback.password,
	};
}

export function resolveNode(
	nodeIdLabel: string,
	labels: Record<string, string | undefined>,
): ResolvedNode | null {
	const id = labels[nodeIdLabel];
	const name = labels[CLAB_BUILT_IN_LABELS.name];
	const deviceKind = labels[CLAB_BUILT_IN_LABELS.deviceKind];

	if (!id || !name || !deviceKind) return null;

	return { id, name, deviceKind };
}
