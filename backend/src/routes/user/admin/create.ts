import { users } from "@/db/schema";
import { AppWithServices } from "@/plugins/services";
import { success } from "@/utils/response";
import { t } from "elysia";

const CreateAdminRequest = t.Object({
	name: t.String(),
	email: t.String({ format: "email" }),
	password: t.String({
		minLength: 8,
		maxLength: 128
	})
});

export default (app: AppWithServices) =>
	app.post(
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
