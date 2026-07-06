export const LABELS = {
	LAB_NODE_ID: "vlab.lab.node.id",
	SESSION_ID: "vlab.lab.session.id",
	OWNER_ID: "vlab.lab.owner.id",
	LAB_ID: "vlab.lab.id",
	LAB_DUE: "vlab.lab.due",
	DEVICE_TEMPLATE_ID: "vlab.device.template.id",
} as const;

export const MIKROTIK_NOREBOOT_FILENAME = "mikrotik-noreboot.rsc";
export const MIKROTIK_NOREBOOT_CONTENT =
	"/user group set [find] policy=!reboot\n";

// Auto-heal tuning: debounce flapping healthchecks, and give up loudly
// instead of retrying forever.
export const HEAL_COOLDOWN_MS = 60_000;
export const HEAL_MAX_ATTEMPTS = 3;
export const HEAL_RETRY_BASE_MS = 5_000;
export const HEAL_RETRY_FACTOR = 3;
// Random delay before the first heal attempt, so a batch of nodes going
// unhealthy at the same instant (e.g. a multi-lab deploy) doesn't restart
// them all simultaneously and pile onto host contention.
export const HEAL_TRIGGER_JITTER_MS = 3_000;

// gRPC reconnect tuning: full-jitter exponential backoff.
export const RECONNECT_BASE_MS = 1_000;
export const RECONNECT_FACTOR = 2;
export const RECONNECT_CAP_MS = 30_000;

export const METRICS_INTERVAL_MS = 10_000;
