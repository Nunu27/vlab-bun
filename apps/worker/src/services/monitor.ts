import { createMonitor } from "@vlab/clab-monitor";
import { pino } from "pino";
import { LABELS } from "../commands/clab.js";
import docker from "../utils/docker.js";

const logger = pino({ name: "monitor" });
const CLAB_HOST = process.env.CLAB_URL
	? new URL(process.env.CLAB_URL).hostname
	: "localhost";

export const clabMonitor = createMonitor({
	host: CLAB_HOST,
	logger: logger,
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
