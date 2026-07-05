import clab from "@worker/lib/clab";
import baseLogger from "@worker/lib/logger";
import { destroyLab } from "./destroy";

const logger = baseLogger.child({ service: "clab" });

// Called once on worker connect: tear down leftover sessions
export async function reconcileSessions(activeSessionIds: string[]) {
	const active = new Set(activeSessionIds);
	const deployedIds = await clab.listDeployedIds();

	const destroyed: string[] = [];
	for (const id of deployedIds) {
		if (active.has(id)) continue;

		try {
			await destroyLab(id);
			destroyed.push(id);
		} catch (error) {
			logger.error(
				{ err: error, sessionId: id },
				"Failed to destroy stale lab session",
			);
		}
	}

	return destroyed;
}

export async function checkPrerequisites() {
	return clab.checkPrerequisites();
}
