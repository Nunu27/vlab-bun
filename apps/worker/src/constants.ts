export const LABELS = {
	LAB_NODE_ID: "vlab.lab.node.id",
	SESSION_ID: "vlab.lab.session.id",
	OWNER_ID: "vlab.lab.owner.id",
	LAB_ID: "vlab.lab.id",
	LAB_DUE: "vlab.lab.due",
	DEVICE_TEMPLATE_ID: "vlab.device.template.id",
} as const;

export const MIKROTIK_GUARD_FILENAME = "mikrotik-guard.rsc";

// Applied to every mikrotik_ros node via startup-config. Two protections:
//
// 1. Strip the `reboot` policy so a lab session cannot restart the router.
// 2. Keep the two services the platform depends on alive. `ssh` (22) is the
//    student's own console through Guacamole and `api` (8728) is how the
//    evaluator reads their configuration, so disabling either silently ends
//    the lab: the first locks the student out, the second stops all grading
//    while their work still looks correct. Labs legitimately teach turning
//    off telnet/ftp, and it is an easy mistake to over-apply that to ssh or
//    api, so a scheduler puts them back.
//
// The scheduler is deliberately conditional (`find ... disabled=yes`): acting
// only when something is actually wrong keeps it silent in the log, which
// matters because the evaluator's `mikrotik.ip-services` source re-reads on
// log activity and `subscribeAny` wakes connectivity probes from it. An
// unconditional enable would turn those event-driven checks into a 10s poll.
export const MIKROTIK_GUARD_CONTENT = [
	"/user group set [find] policy=!reboot",
	'/system scheduler add name=vlab-service-guard interval=10s comment="vLab: keeps ssh (student console) and api (grading) reachable - do not remove" on-event="/ip service enable [find name=ssh disabled=yes]; /ip service enable [find name=api disabled=yes]"',
	"",
].join("\n");

// Name resolution on Linux lab nodes. Applied as startup execs.
//
// resolv.conf is overwritten so a lab node never inherits Docker's embedded
// resolver, which only answers for container names and would otherwise leak
// container-internal name resolution into a lab session. Some labs (module
// 1's DNS/DHCP section) then point it at a real, reachable resolver inside
// the topology as part of the lab itself.
export const LINUX_NAME_RESOLUTION_EXECS = [
	`sh -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'`,
];

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

// Device template cost measurement. Docker pushes a stats frame about once a
// second, so the sample count roughly equals the window in seconds.
export const STATS_SAMPLE_COUNT = 6;
export const STATS_SAMPLE_TIMEOUT_MS = 20_000;
// No headroom is applied to the measurement. It becomes a *reservation*, and a
// reservation gains nothing from padding: what stops a node ballooning is its
// cgroup cap, not the number the scheduler set aside for it. Memory is already
// reported as the peak across samples, so padding that would be a second
// arbitrary margin on top of an already worst-case figure. Headroom belongs on
// a limit, and limits are set by hand, never derived from a measurement.
/**
 * Peak-to-limit ratio above which a measurement is treated as suspect. A
 * container held this near its cap is usually being kept there by reclaim
 * rather than having settled, so its "usage" reads lower than what it needs.
 * Measured on RouterOS: 97% of a 128MB cap and 95% of 176MB, both squeezed,
 * against 70% once the cap was 256MB and the footprint could settle.
 */
export const STATS_TIGHT_LIMIT_RATIO = 0.85;
