import db from "@manager/db";
import { students } from "@manager/db/schema/auth";
import { labSessions } from "@manager/db/schema/lab-session";
import baseLogger from "@manager/lib/logger";
import { getAffectedCount } from "@manager/utils/db";
import { and, eq, isNotNull } from "drizzle-orm";

const logger = baseLogger.child({ service: "clear-sessions" });

export async function runClearSessions(nrp?: string) {
	let deleted = 0;

	if (nrp) {
		const student = await db.query.students.findFirst({
			where: eq(students.nrp, nrp),
		});

		if (!student) {
			logger.error({ nrp }, "Student not found");
			return;
		}

		deleted = await getAffectedCount(
			db
				.delete(labSessions)
				.where(
					and(
						eq(labSessions.studentId, student.id),
						isNotNull(labSessions.submittedAt),
					),
				),
		);
		logger.info(
			{ count: deleted, nrp },
			"Cleared submitted lab sessions for student",
		);
	} else {
		deleted = await getAffectedCount(
			db.delete(labSessions).where(isNotNull(labSessions.submittedAt)),
		);
		logger.info({ count: deleted }, "Cleared all submitted lab sessions");
	}
}
