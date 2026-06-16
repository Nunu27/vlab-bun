import { responses, success } from "@jawit/common";
import db from "@manager/db";
import caching from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { RequestWithId } from "@vlab/shared/schemas/common";
import type { LabTopology } from "@vlab/shared/schemas/lab";

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
						ENTITY: { KEY: key },
					}) => {
						cache.addSuffix(labId);
						if (user.role === "student") {
							cache.addSuffix(user.id);
						}

						cache.set(key);
					},
				)
				.get(
					"/:labId",
					async ({
						params: { labId },
						session: { data: user },
						status,
						ENTITY: { LABEL: label },
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
									topology: lab.topology as LabTopology,
									date: { from: startAt, to: endAt },
									enrolled: !!enrollments?.length,
									instructor: {
										...user,
										...instructor,
									},
								},
							});
						} else return status(404, responses.notFound(label));
					},
				);
		},
	);
