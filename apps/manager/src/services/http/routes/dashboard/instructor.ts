import { success } from "@jawit/common";
import db from "@manager/db";
import { labEnrollments, labSessions, labs } from "@manager/db/schema";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { eq, sql } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.get(
		"/instructor",
		async ({ session: { data: user } }) => {
			// 1. Group labs by published status in a single query
			const labCounts = await db
				.select({
					isPublished: labs.isPublished,
					total: sql<number>`count(*)::int`,
				})
				.from(labs)
				.where(eq(labs.instructorId, user.id))
				.groupBy(labs.isPublished);

			// 2. Aggregate session stats for the instructor's labs
			const sessionStats = await db
				.select({
					active: sql<number>`count(*) filter (where ${labSessions.submittedAt} is null)::int`,
					completed: sql<number>`count(*) filter (where ${labSessions.submittedAt} is not null)::int`,
					avgScore: sql<number>`avg(${labSessions.score})::float`,
				})
				.from(labSessions)
				.innerJoin(labs, eq(labSessions.labId, labs.id))
				.where(eq(labs.instructorId, user.id));

			// 3. Count enrolled students across all instructor's labs
			const studentCount = await db
				.select({
					total: sql<number>`count(distinct ${labEnrollments.studentId})::int`,
				})
				.from(labEnrollments)
				.innerJoin(labs, eq(labEnrollments.labId, labs.id))
				.where(eq(labs.instructorId, user.id));

			const labsData = { published: 0, draft: 0, total: 0 };
			for (const r of labCounts) {
				if (r.isPublished) labsData.published = r.total;
				else labsData.draft = r.total;
				labsData.total += r.total;
			}

			const sessionData = sessionStats[0] || {
				active: 0,
				completed: 0,
				avgScore: 0,
			};

			const totalStudents = studentCount[0]?.total || 0;

			return success({
				data: {
					labs: labsData,
					sessions: {
						total: sessionData.active + sessionData.completed,
						active: sessionData.active,
						completed: sessionData.completed,
						avgScore: sessionData.avgScore || 0,
					},
					students: totalStudents,
				},
			});
		},
		{ private: ["instructor"] },
	);
