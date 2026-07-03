export const LABELS = {
	LAB_NODE_ID: "vlab.lab.node.id",
	SESSION_ID: "vlab.lab.session.id",
	SESSION_NODE_ID: "vlab.lab.session.node.id",
	OWNER_ID: "vlab.lab.owner.id",
	LAB_ID: "vlab.lab.id",
	LAB_DUE: "vlab.lab.due",
	DEVICE_TEMPLATE_ID: "vlab.device.template.id",
} as const;

// Upper bound on the random delay before an unhealthy node's single auto-heal
// redeploy attempt fires, so a batch of nodes that go unhealthy together (e.g.
// a CPU-starved concurrent boot) don't all get redeployed in the same instant.
export const MAX_HEAL_JITTER_MS = 30_000;
