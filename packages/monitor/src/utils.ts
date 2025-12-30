import type { ContainerInspectInfo } from "dockerode";

export const healthyStatus = new Set([null, "healthy"]);

export function isKey<T extends object>(
	key: PropertyKey,
	obj: T
): key is keyof T {
	return key in obj;
}

export function extractPortMappings(inspect: ContainerInspectInfo) {
	const portMappings: Record<number, number> = {};

	for (const [containerPortKey, bindings] of Object.entries(
		inspect.NetworkSettings?.Ports
	)) {
		if (!bindings || bindings.length === 0) continue;

		const containerPort = parseInt(containerPortKey);
		const hostPort = parseInt(bindings[0]!.HostPort);

		if (!isNaN(containerPort) && !isNaN(hostPort)) {
			portMappings[containerPort] = hostPort;
		}
	}

	return portMappings;
}

export function removeItemFromArray<T>(arr: T[], item: T) {
	const index = arr.indexOf(item);
	removeItemFromArrayByIndex(arr, index);
}

export function removeItemFromArrayByIndex<T>(arr: T[], index: number) {
	if (index < 0 || index >= arr.length) return;

	arr[index] = arr.at(-1)!;
	arr.pop();
}
