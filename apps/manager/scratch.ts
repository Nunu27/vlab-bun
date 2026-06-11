import db from "./src/db";
import { workers } from "./src/db/schema";

try {
	await db.insert(workers).values({
		id: "test-worker",
		status: "online",
		managerId: "test",
		lastSeen: new Date(),
		cpuCores: 20,
		memoryMB: 15645,
		storageMB: 235520,
		cpuUsagePercent: "0",
		memoryUsagePercent: "0",
		storageUsagePercent: "0",
		score: "0",
	});
	console.log("Success!");
} catch (e) {
	console.error("Error:", e);
}
