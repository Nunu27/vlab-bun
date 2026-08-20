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
// Lab nodes deliberately have no default route (the modules have students add
// their own gateway), so whatever nameserver is configured is unreachable.
// glibc reports that as a *temporary* failure, and on a temporary failure
// `tracepath` prints `???` for the hop instead of falling back to the numeric
// address — which makes the trace steps in the routing modules unreadable,
// even when the student's config is perfectly correct.
//
// Dropping `dns` from nsswitch's `hosts:` line turns those lookups into an
// immediate permanent failure, so tracepath prints the IP. Nothing in a lab
// needs DNS: there is no route off the topology to reach one.
//
// resolv.conf is still overwritten. Once `hosts:` is `files` nothing consults
// it, but leaving Docker's embedded resolver in place would point a lab node
// at a nameserver that only answers for container names.
export const LINUX_NAME_RESOLUTION_EXECS = [
	`sh -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'`,
	`sh -c 'sed -i "s/^hosts:.*/hosts: files/" /etc/nsswitch.conf'`,
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
