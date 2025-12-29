import db from "@backend/db";
import { addDBListener } from "@backend/db/listener";
import { labSessions } from "@backend/db/schema/lab-session";
import logger from "@backend/services/logger";
import cluster from "cluster";
import { eq } from "drizzle-orm";
import Elysia from "elysia";

import deviceTestSessionCleanup from "./device-test-session-cleanup";

const cron = new Elysia().use(deviceTestSessionCleanup);

addDBListener(
	"labSessions",
	["type"],
	async ({ op, data }) => {
		const hasDeviceTest = data.some(
			(d) => (d.current?.type || d.previous?.type) === "device-test"
		);

		if (!hasDeviceTest) return;

		const cronEntry = cron.store.cron["device-test-session-cleanup"];

		if (op === "INSERT" && !cronEntry.isRunning()) {
			cronEntry.resume();
			logger.debug("Resumed device test session cleanup cron job");
		} else if (op === "DELETE" && cronEntry.isRunning()) {
			const count = await db.$count(
				labSessions,
				eq(labSessions.type, "device-test")
			);

			if (count) return;

			cronEntry.pause();
			logger.debug("Paused device test session cleanup cron job");
		}
	},
	{ ops: ["INSERT", "DELETE"], paused: cluster.isWorker, bulk: true }
);

export default cron;
