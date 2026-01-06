import db from "@backend/db";
import dbListener from "@backend/db/listener";
import { labSessions } from "@backend/db/schema/lab-session";
import logger from "@backend/services/logger";
import type { Operations } from "@backend/types";
import { debounce } from "@backend/utils/debouncer";
import cluster from "cluster";
import { eq } from "drizzle-orm";
import Elysia from "elysia";

import labSessionCleanup from "./lab-session-cleanup";

const cron = new Elysia().use(labSessionCleanup);

const updateCronJob = debounce(
	async (op: Operations) => {
		const cronEntry = cron.store.cron["lab-session-cleanup"];

		if (op === "INSERT" && !cronEntry.isRunning()) {
			cronEntry.resume();
			logger.debug("Resumed lab session cleanup cron job");
		} else if (op === "DELETE" && cronEntry.isRunning()) {
			const count = await db.$count(labSessions, eq(labSessions.type, "user"));

			if (count) return;

			cronEntry.pause();
			logger.debug("Paused lab session cleanup cron job");
		}
	},
	5 * 60 * 1000
);

dbListener.addListener(
	"labSessions",
	["type"],
	async ({ op, data }) => {
		const hasDeviceTest = data.some(
			(d) => (d.current?.type || d.previous?.type) === "user"
		);

		if (!hasDeviceTest) return;

		await updateCronJob(op);
	},
	{ ops: ["INSERT", "DELETE"], paused: cluster.isWorker, bulk: true }
);

export default cron;
