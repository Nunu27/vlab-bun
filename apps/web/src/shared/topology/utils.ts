import type { LabDeviceNode } from "@vlab/shared/schemas/lab";
import {
	DEVICE_HEIGHT,
	DEVICE_WIDTH,
	GRID_SIZE,
	GROUP_HEADER_HEIGHT,
	GROUP_PADDING,
} from "./constants";
import type { BoundingBox, Dictionary, Dimensions, Position } from "./types";

export const snapToGrid = (val: number) =>
	Math.round(val / GRID_SIZE) * GRID_SIZE;

export const cross = (a: Position, b: Position, o: Position) =>
	(a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

export const getBoundingBoxCenter = (bbox: BoundingBox): Position => ({
	x: (bbox.x1 + bbox.x2) / 2,
	y: (bbox.y1 + bbox.y2) / 2,
});

export const isInBoundingBox = (bbox: BoundingBox, pos: Position) => {
	return (
		bbox.x1 <= pos.x && pos.x <= bbox.x2 && bbox.y1 <= pos.y && pos.y <= bbox.y2
	);
};

export const calculateGroupDimensions = (
	members: string[],
	devices: Dictionary<string, LabDeviceNode>,
): Position & Dimensions => {
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;

	members.forEach((id) => {
		const device = devices[id];
		if (!device) return;

		minX = Math.min(minX, device.x);
		minY = Math.min(minY, device.y);
		maxX = Math.max(maxX, device.x + DEVICE_WIDTH);
		maxY = Math.max(maxY, device.y + DEVICE_HEIGHT);
	});

	return {
		x: minX - GROUP_PADDING,
		y: minY - GROUP_PADDING - GROUP_HEADER_HEIGHT,
		width: maxX - minX + GROUP_PADDING * 2,
		height: maxY - minY + (GROUP_PADDING + GROUP_HEADER_HEIGHT) * 2,
	};
};
