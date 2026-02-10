import db from "@api/db";
import {
	departments,
	deviceCategories,
	deviceTemplates,
	labSessions,
	labs,
	studyPrograms,
	users,
} from "@api/db/schema";
import auth from "@api/middlewares/auth";
import { createRouter } from "@api/plugins/system";
import { success } from "@jawit/common";
import { sql } from "drizzle-orm";

export default createRouter({ prefix: "/dashboard", tags: ["Dashboard"] })
	.use(auth)
	.get(
		"/admin",
		async () => {
			// 1. Group users by role in a single query
			const userCounts = await db
				.select({
					role: users.role,
					total: sql<number>`count(*)::int`,
				})
				.from(users)
				.groupBy(users.role);

			// 2. Group labs by published status in a single query
			const labCounts = await db
				.select({
					isPublished: labs.isPublished,
					total: sql<number>`count(*)::int`,
				})
				.from(labs)
				.groupBy(labs.isPublished);

			// 3. Aggregate session stats (active, completed, average score)
			const sessionStats = await db
				.select({
					active: sql<number>`count(*) filter (where ${labSessions.submittedAt} is null)::int`,
					completed: sql<number>`count(*) filter (where ${labSessions.submittedAt} is not null)::int`,
					avgScore: sql<number>`avg(${labSessions.score})::float`,
				})
				.from(labSessions);

			// 4. Batch query the flat table counts
			const [
				templateCount,
				deviceCategoryCount,
				departmentCount,
				studyProgramCount,
			] = await Promise.all([
				db.$count(deviceTemplates),
				db.$count(deviceCategories),
				db.$count(departments),
				db.$count(studyPrograms),
			]);

			// Transform grouped data
			const usersData = { admin: 0, instructor: 0, student: 0 };
			for (const r of userCounts) {
				if (r.role in usersData) {
					usersData[r.role as keyof typeof usersData] = r.total;
				}
			}

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

			return success({
				data: {
					users: usersData,
					labs: labsData,
					sessions: {
						total: sessionData.active + sessionData.completed,
						active: sessionData.active,
						completed: sessionData.completed,
						avgScore: sessionData.avgScore || 0,
					},
					templates: templateCount,
					deviceCategories: deviceCategoryCount,
					departments: departmentCount,
					studyPrograms: studyProgramCount,
				},
			});
		},
		{ private: ["admin"] },
	);
