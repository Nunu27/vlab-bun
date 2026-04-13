import { EventEmitter } from "node:events";
import env from "@api/env";
import type { TempNodeEvents } from "@api/types/clab";
import type { TypedEventEmitter } from "@api/types/events";
import { createMonitor } from "@vlab/clab-monitor";
import docker from "./docker";
import logger from "./logger";

const CLAB_HOST = new URL(env.CLAB_URL).hostname;

export const LABELS = {
	LAB_NODE_ID: "vlab.lab.node.id",
	SESSION_ID: "vlab.lab.session.id",
	SESSION_NODE_ID: "vlab.lab.session.node.id",
	OWNER_ID: "vlab.lab.owner.id",
	LAB_ID: "vlab.lab.id",
	LAB_DUE: "vlab.lab.due",
	DEVICE_TEMPLATE_ID: "vlab.device.template.id",
} as const;

export const clabMonitor = createMonitor({
	host: CLAB_HOST,
	logger: logger.child({ service: "monitor" }),
	docker,
	filter: (data) => !!data.ownerId,
	isTemp: (data) => {
		return (
			!data.labNodeId || !data.deviceTemplateId || !data.labId || !data.labDue
		);
	},
	isStale: ({ labDue }) => {
		const due = Number(labDue);

		return Number.isNaN(due) || Date.now() >= due;
	},
	mapping: {
		sessionId: LABELS.SESSION_ID,
		nodeId: LABELS.SESSION_NODE_ID,
		labId: LABELS.LAB_ID,
		labDue: LABELS.LAB_DUE,
		ownerId: { label: LABELS.OWNER_ID, required: true },
		labNodeId: LABELS.LAB_NODE_ID,
		deviceTemplateId: LABELS.DEVICE_TEMPLATE_ID,
	} as const,
});

export const tempNodeEvents =
	new EventEmitter() as TypedEventEmitter<TempNodeEvents>;
