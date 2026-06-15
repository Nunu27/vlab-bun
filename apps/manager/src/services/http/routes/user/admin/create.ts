import { success } from "@jawit/common";
import db from "@manager/db";
import { users } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { CreateAdminRequest } from "@vlab/shared/schemas/admin";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, entity: { label } }) => {
			const [{ id }] = await db
				.insert(users)
				.values({
					email: body.email,
					name: body.name,
					role: "admin",
					passwordHash: await Bun.password.hash(body.password),
				})
				.returning({ id: users.id });

			return success({ message: `${label} created`, data: { id } });
		},
		{
			private: ["admin"],
			body: CreateAdminRequest,
		},
	);
