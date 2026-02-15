import db from "@api/db";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { failure, success } from "@jawit/common";
import { RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter()
	.use(caching)
	.guard(
		{
			cached: true,
			private: ["student", "instructor"],
			params: RequestWithId(["labId"]),
		},
		(app) => {
			return app
				.resolve(
					({
						session: { data: user },
						cache,
						params: { labId },
						entity: { key },
					}) => {
						cache.addSuffix(labId);
						if (user.role === "student") {
							cache.addPrefix(user.id);
						}

						return {
							cacheKey: key,
						};
					},
				)
				.get(
					"/:labId",
					async ({
						params: { labId },
						session: { data: user },
						status,
						entity: { label },
					}) => {
						const data = await db.query.labs.findFirst({
							columns: { instructorId: false },
							where: (labs, { eq }) => eq(labs.id, labId),
							with: {
								instructor: {
									columns: { nip: true },
									with: {
										user: {
											columns: { id: true, name: true },
										},
									},
								},
								attachments: {
									columns: { name: true, file: true },
								},
								enrollments:
									user.role === "student"
										? {
												columns: { studentId: true },
												where: (enrollments, { eq }) =>
													eq(enrollments.studentId, user.id),
											}
										: undefined,
							},
						});

						if (data) {
							const {
								instructor: { user, ...instructor },
								enrollments,
								startAt,
								endAt,
								...lab
							} = data;

							return success({
								data: {
									...lab,
									date: { from: startAt, to: endAt },
									enrolled: !!enrollments?.length,
									instructor: {
										...user,
										...instructor,
									},
								},
							});
						} else
							return status(404, failure({ message: `${label} not found` }));
					},
				);
		},
	);
