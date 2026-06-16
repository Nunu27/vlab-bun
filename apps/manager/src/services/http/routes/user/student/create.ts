import { responses } from "@jawit/common";
import db from "@manager/db";
import { students, users } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { CreateStudentRequest } from "@vlab/shared/schemas/student";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, ENTITY: { LABEL: label } }) => {
			const id = await db.transaction(async (tx) => {
				const [{ id }] = await tx
					.insert(users)
					.values({
						email: body.email,
						name: body.name,
						passwordHash: await Bun.password.hash(body.password),
					})
					.returning({ id: users.id });
				await tx.insert(students).values({ id, ...body });

				return id;
			});
			return responses.created(label, { id });
		},
		{ private: ["admin"], body: CreateStudentRequest },
	);
