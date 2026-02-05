import db from "@api/db";
import { users } from "@api/db/schema/auth";
import auth from "@api/middlewares/auth";
import { cache } from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { success } from "@jawit/common";
import { CreateAdminRequest } from "@vlab/shared/schemas/admin";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, entity: { label, key } }) => {
			const [{ id }] = await db
				.insert(users)
				.values({
					email: body.email,
					name: body.name,
					role: "admin",
					passwordHash: await Bun.password.hash(body.password),
				})
				.returning({ id: users.id });
			await cache.delete(`${key}:pagination:*`);

			return success({ message: `${label} created`, data: { id } });
		},
		{
			private: ["admin"],
			body: CreateAdminRequest,
		},
	);
