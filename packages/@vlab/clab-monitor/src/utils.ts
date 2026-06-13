import type { ContainerInfo } from "dockerode";
import {
	CLAB_BUILT_IN_LABELS,
	type FullMappingConstraint,
	type ResolvedData,
	type ResolvedMapping,
} from "./types";

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

export function buildResolvedData<TFullMapping extends FullMappingConstraint>(
	mapping: TFullMapping,
	labels: Record<string, string | undefined>,
): ResolvedData<TFullMapping> | null {
	const sessionId = labels[mapping.sessionId];
	const nodeId = labels[mapping.nodeId];
	const name = labels[CLAB_BUILT_IN_LABELS.name];
	const deviceKind = labels[CLAB_BUILT_IN_LABELS.deviceKind];

	if (!sessionId || !nodeId || !name || !deviceKind) return null;

	const userResolved = {} as ResolvedMapping<TFullMapping>;
	for (const _key of Object.keys(mapping)) {
		if (_key === "sessionId" || _key === "nodeId") continue;

		const entry = mapping[_key as keyof TFullMapping];
		if (!entry) continue;

		if (typeof entry === "string") {
			(userResolved as Record<string, string | undefined>)[_key] =
				labels[entry];
		} else {
			const value = labels[entry.label];
			if (entry.required && !value) return null;

			(userResolved as Record<string, string | undefined>)[_key] = value;
		}
	}

	return {
		sessionId,
		nodeId,
		name,
		deviceKind,
		...userResolved,
	} as ResolvedData<TFullMapping>;
}
