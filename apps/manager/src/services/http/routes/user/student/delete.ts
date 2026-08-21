import { responses } from "@jawit/common";
import db from "@manager/db";
import { users } from "@manager/db/schema/auth";
import { submitSession } from "@manager/domain/lab-session/submit";
import auth, { sessions } from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { and, eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.delete(
		"/:id",
		async ({ params: { id }, status, ENTITY: { LABEL: label } }) => {
			// labSessions cascades away with the student row (see schema), which
			// would silently orphan any lab still running on a worker. Tear those
			// down first so the worker is actually released.
			const activeSessions = await db.query.labSessions.findMany({
				columns: { id: true, workerId: true },
				where: (session, { and, eq, isNull }) =>
					and(eq(session.studentId, id), isNull(session.submittedAt)),
			});

			for (const session of activeSessions) {
				await submitSession(session.id, session.workerId);
			}

			const rowCount = await getAffectedCount(
				db
					.delete(users)
					.where(and(eq(users.id, id), eq(users.role, "student")))
					.$dynamic(),
			);

			if (rowCount) {
				await cache.delete(`me:${id}`);
				await sessions.delete(id);

				return responses.deleted(label);
			} else return status(404, responses.notFound(label));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
		},
	);
