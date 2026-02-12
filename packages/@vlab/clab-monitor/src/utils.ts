import type { ContainerInfo } from "dockerode";

export const healthyStatus = new Set([null, "healthy"]);

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
