import { success } from "@jawit/common";
import db from "@manager/db";
import {
	instructors,
	labEnrollments,
	labSessions,
	labs,
	users,
} from "@manager/db/schema";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { and, desc, eq, sql } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.get(
		"/student",
		async ({ session: { data: user } }) => {
			// 1. Fetch top 5 recently enrolled labs
			const enrolledLabs = await db
				.select({
					id: labs.id,
					name: labs.name,
					cover: labs.cover,
					date: {
						from: labs.startAt,
						to: labs.endAt,
					},
					instructor: {
						id: users.id,
						name: users.name,
					},
					enrolledAt: labEnrollments.createdAt,
				})
				.from(labEnrollments)
				.innerJoin(labs, eq(labEnrollments.labId, labs.id))
				.innerJoin(instructors, eq(labs.instructorId, instructors.id))
				.innerJoin(users, eq(instructors.id, users.id))
				.where(eq(labEnrollments.studentId, user.id))
				.orderBy(desc(labEnrollments.createdAt))
				.limit(5);

			// 2. Fetch top 5 upcoming labs (enrolled but not completed)
			const upcomingLabs = await db
				.select({
					id: labs.id,
					name: labs.name,
					cover: labs.cover,
					endAt: labs.endAt,
				})
				.from(labEnrollments)
				.innerJoin(labs, eq(labEnrollments.labId, labs.id))
				.leftJoin(
					labSessions,
					and(
						eq(labSessions.labId, labs.id),
						eq(labSessions.studentId, user.id),
					),
				)
				.where(
					and(
						eq(labEnrollments.studentId, user.id),
						// Filters out labs that are already completed
						sql`${labSessions.submittedAt} is null`,
					),
				)
				.orderBy(labs.endAt)
				.limit(5);

			return success({
				data: {
					enrolledLabs,
					upcomingLabs,
				},
			});
		},
		{ private: ["student"] },
	);
