import db from "@backend/db";
import { addDBListener } from "@backend/db/listener";
import { deviceTestSessions } from "@backend/db/schema/lab-device";
import { Elysia } from "elysia";
import cluster from "node:cluster";

import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import list from "./list";
import pagination from "./pagination";
import update from "./update";
import cron from "./cron";

const deviceRouter = new Elysia({
	detail: { tags: ["Device"] }
})
	.use(cron)
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(pagination)
	.use(list);

if (cluster.isPrimary) {
	addDBListener(
		"deviceTestSessions",
		[],
		async ({ op }) => {
			const cron = deviceRouter.store.cron["device-test-session-cleanup"];

			if (op === "INSERT" && !cron.isRunning()) {
				cron.resume();
			} else if (op === "DELETE" && cron.isRunning()) {
				if (await db.$count(deviceTestSessions)) return;

				cron.pause();
			}
		},
		{ ops: ["INSERT", "DELETE"], bulk: true }
	);
}

export default deviceRouter;
