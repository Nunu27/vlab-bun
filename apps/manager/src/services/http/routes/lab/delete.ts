import { responses } from "@jawit/common";
import db from "@manager/db";
import { labs } from "@manager/db/schema/lab";
import { submitSession } from "@manager/domain/lab-session/submit";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { and, eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.delete(
		"/:labId",
		async ({
			params: { labId: id },
			session,
			status,
			ENTITY: { LABEL: label, KEY: key },
		}) => {
			const owned = await db.query.labs.findFirst({
				columns: { id: true },
				where: (l, { and, eq }) =>
					and(eq(l.id, id), eq(l.instructorId, session.data.id)),
			});
			if (!owned) return status(404, responses.notFound(label));

			// labSessions cascades away with the lab row (see schema), which would
			// silently orphan any student lab still running on a worker. Tear
			// those down first so the worker is actually released.
			const activeSessions = await db.query.labSessions.findMany({
				columns: { id: true, workerId: true },
				where: (labSession, { and, eq, isNull }) =>
					and(eq(labSession.labId, id), isNull(labSession.submittedAt)),
			});

			for (const activeSession of activeSessions) {
				await submitSession(activeSession.id, activeSession.workerId);
			}

			const deleted = await db.transaction(async (tx) => {
				const rowCount = await getAffectedCount(
					tx
						.delete(labs)
						.where(and(eq(labs.id, id), eq(labs.instructorId, session.data.id)))
						.$dynamic(),
				);

				if (!rowCount) return false;
				return true;
			});

			if (deleted) {
				await cache.delete(`${key}:${id}:*`, `${key}:${id}`);

				return responses.deleted(label);
			} else return status(404, responses.notFound(label));
		},
		{
			private: ["instructor"],
			params: RequestWithId(["labId"]),
		},
	);
