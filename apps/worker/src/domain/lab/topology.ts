import type { Static } from "@sinclair/typebox";
import type {
	ContainerlabLinkDefinition,
	ContainerlabNodeDefinition,
	ContainerlabTopologyDefinition,
} from "@vlab/clab";
import type { LabConfigSchema } from "@vlab/grpc";
import { toKebabCase } from "@vlab/shared/utils";
import { LABELS, MIKROTIK_NOREBOOT_FILENAME } from "@worker/constants";
import env from "@worker/env";

// Built per-call
// Removing default route, internal DNS and also prevent shutdown/reboot
function buildStartupExecs(): Partial<Record<string, string[]>> {
	return {
		linux: [
			"ip route del default",
			`ip route add ${env.GUACD_IP} dev eth0`,
			`sh -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'`,
			"sh -c 'rm -f /sbin/shutdown /sbin/poweroff /sbin/reboot /sbin/halt /usr/sbin/shutdown /usr/sbin/poweroff /usr/sbin/reboot /usr/sbin/halt || true'",
			'sh -c \'printf "#!/bin/sh\\necho \\"Shutdown is disabled in this lab.\\" >&2\\nexit 1\\n" > /sbin/shutdown\'',
			"sh -c 'chmod +x /sbin/shutdown'",
			"sh -c 'ln -s /sbin/shutdown /sbin/poweroff || true'",
			"sh -c 'ln -s /sbin/shutdown /sbin/reboot || true'",
			"sh -c 'ln -s /sbin/shutdown /sbin/halt || true'",
		],
	};
}

export type BuiltTopology = {
	topology: ContainerlabTopologyDefinition;
	idByKebabName: Record<string, string>;
};

export function buildTopology(
	sessionId: string,
	config: Static<typeof LabConfigSchema>,
): BuiltTopology {
	const defaultLabels: Record<string, string> = {
		[LABELS.SESSION_ID]: sessionId,
		[LABELS.OWNER_ID]: config.ownerId,
	};

	if (config.labId) defaultLabels[LABELS.LAB_ID] = config.labId;
	if (config.dueDate) defaultLabels[LABELS.LAB_DUE] = config.dueDate.toString();

	const nodeNames: Record<string, string> = {};
	const idByKebabName: Record<string, string> = {};
	const nodes: Record<string, ContainerlabNodeDefinition> = {};
	const startupExecs = buildStartupExecs();

	for (const {
		id,
		name,
		resources,
		deviceId,
		credentials,
		env: nodeEnv,
		...rest
	} of config.nodes) {
		const kebabName = toKebabCase(name);
		idByKebabName[kebabName] = id;
		nodeNames[id] = kebabName;

		const labels: Record<string, string> = {};
		if (deviceId) {
			labels[LABELS.DEVICE_TEMPLATE_ID] = deviceId;
			labels[LABELS.LAB_NODE_ID] = id;
		}

		const nodeEnvVars = { ...nodeEnv };
		if (rest.kind === "linux" && credentials) {
			if (credentials.username) nodeEnvVars.USERNAME = credentials.username;
			if (credentials.password) nodeEnvVars.PASSWORD = credentials.password;
		}

		nodes[kebabName] = {
			...rest,
			env: nodeEnvVars,
			cpu: resources.cpu ?? undefined,
			memory: resources.memory ?? undefined,
			labels,
			credentials,
			stages: {
				configure: {
					exec: startupExecs[rest.kind]?.map((command) => ({
						command,
						target: "container",
						phase: "on-exit",
					})),
				},
			},
		};

		if (rest.kind === "mikrotik_ros") {
			nodes[kebabName]["startup-config"] =
				`${env.CLAB_TOPOLOGIES_PATH}/${MIKROTIK_NOREBOOT_FILENAME}`;
		}
	}

	const links: ContainerlabLinkDefinition[] =
		config.links?.map((link) => ({
			endpoints: [
				`${nodeNames[link.sourceId]}:${link.sourceInterface}`,
				`${nodeNames[link.targetId]}:${link.targetInterface}`,
			],
		})) ?? [];

	return {
		topology: {
			name: sessionId,
			mgmt: { network: env.CLAB_MGMT_NETWORK },
			topology: {
				defaults: { labels: defaultLabels },
				nodes,
				links,
			},
		},
		idByKebabName,
	};
}
