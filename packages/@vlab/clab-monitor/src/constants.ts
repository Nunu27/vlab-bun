export const CLAB_LABELS = {
	NAME: "clab-node-name",
	KIND: "clab-node-kind",
	LAB: "containerlab",
};

export const NODE_HEALTH_STATUS = new Set<string | null | undefined>([
	"starting",
	"healthy",
	"unhealthy",
	"died",
	"destroyed",
	null,
]);

export const HEALTHY_STATUS = new Set<string | null | undefined>([
	"healthy",
	null,
]);

export const TERMINAL_HEALTH_STATUS = new Set<string | null | undefined>([
	"unhealthy",
	"died",
	"destroyed",
]);
