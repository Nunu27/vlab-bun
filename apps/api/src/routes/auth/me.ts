import db from "@api/db";
import auth from "@api/middlewares/auth";
import caching from "@api/middlewares/caching";
import { failure, success } from "@jawit/common";
import Elysia from "elysia";

export default new Elysia()
	.use(auth)
	.use(caching)
	.get(
		"/me",
		async ({ session, status }) => {
			const user = await db.query.users.findFirst({
				where: (user, { eq }) => eq(user.id, session.data.id),
				with: {
					instructor: {
						columns: { nip: true },
					},
					student: {
						columns: { nrp: true, degreeLevel: true, year: true },
						with: { studyProgram: { columns: { id: true, name: true } } },
					},
				},
			});

			if (!user) return status(404, failure({ message: "User not found" }));
			const { instructor, student, passwordHash, ...rest } = user;

			return success({
				data: {
					...rest,
					...instructor,
					...student,
					casOnly: passwordHash === null,
				},
			});
		},
		{
			protected: true,
			cached: {
				key: "me",
				personalized: true,
			},
		},
	);
