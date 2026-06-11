import { success } from "@jawit/common";
import db from "@manager/db";
import { workers } from "@manager/db/schema";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { desc } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.get(
		"/admin",
		async () => {
			const workerList = await db
				.select({
					id: workers.id,
					status: workers.status,
					lastSeen: workers.lastSeen,
					cpuCores: workers.cpuCores,
					memoryMB: workers.memoryMB,
					storageMB: workers.storageMB,
					cpuUsagePercent: workers.cpuUsagePercent,
					memoryUsagePercent: workers.memoryUsagePercent,
					storageUsagePercent: workers.storageUsagePercent,
					activeLabs: workers.activeLabs,
					activeNodes: workers.activeNodes,
				})
				.from(workers)
				.orderBy(desc(workers.lastSeen));

			return success({
				data: {
					workers: workerList,
				},
			});
		},
		{ private: ["admin"] },
	);
