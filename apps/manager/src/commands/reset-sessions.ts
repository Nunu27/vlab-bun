import db from "@manager/db";
import { labSessions } from "@manager/db/schema/lab-session";
import baseLogger from "@manager/lib/logger";
import { getAffectedCount } from "@manager/utils/db";

const logger = baseLogger.child({ service: "reset-sessions" });

export async function runResetSessions() {
	const deleted = await getAffectedCount(db.delete(labSessions));
	logger.info({ count: deleted }, "All lab sessions cleared");
}
