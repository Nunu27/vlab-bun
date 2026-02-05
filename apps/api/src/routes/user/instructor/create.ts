import db from "@api/db";
import { instructors, users } from "@api/db/schema/auth";
import auth from "@api/middlewares/auth";
import { cache } from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { success } from "@jawit/common";
import { CreateInstructorRequest } from "@vlab/shared/schemas/instructor";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, entity: { label, key } }) => {
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
			await cache.delete(`${key}:pagination:*`);

			return success({ message: `${label} created`, data: { id } });
		},
		{
			private: ["admin"],
			body: CreateInstructorRequest,
		},
	);
