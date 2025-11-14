import { users } from "@backend/db/schema/auth";
import { deleteCache } from "@backend/middlewares/caching";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";
import { CreateAdminRequest } from "./schema";

export default createRouter().post(
	"/",
	async ({ body, db }) => {
		const [user] = await db
			.insert(users)
			.values({
				email: body.email,
				name: body.name,
				role: "admin",
				passwordHash: await Bun.password.hash(body.password)
			})
			.returning({ id: users.id });
		await deleteCache("admin:pagination:*");

		return success({ message: "Admin created", data: { id: user.id } });
	},
	{
		private: ["admin"],
		body: CreateAdminRequest,
		detail: {
			description: "Create a new admin"
		}
	}
);
