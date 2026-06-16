import { responses } from "@jawit/common";
import db from "@manager/db";
import { instructors, users } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { CreateInstructorRequest } from "@vlab/shared/schemas/instructor";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, ENTITY: { LABEL: label } }) => {
			const id = await db.transaction(async (tx) => {
				const [{ id }] = await tx
					.insert(users)
					.values({
						...body,
						role: "instructor",
						passwordHash: await Bun.password.hash(body.password),
					})
					.returning({ id: users.id });
				await tx.insert(instructors).values({ id, ...body });

				return id;
			});
			return responses.created(label, { id });
		},
		{
			private: ["admin"],
			body: CreateInstructorRequest,
		},
	);
