import db from "@api/db";
import { users } from "@api/db/schema/auth";
import auth from "@api/middlewares/auth";
import { createRouter } from "@api/plugins/system";
import { failure, success } from "@jawit/common";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { ChangePasswordRequest } from "@vlab/shared/schemas/user";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.post(
		"/:id/change-password",
		async ({ params: { id }, body, status, entity: { label } }) => {
			const user = await db.query.users.findFirst({
				where: (u, { eq }) => eq(u.id, id),
				columns: { id: true },
			});

			if (!user) return status(404, failure({ message: `${label} not found` }));
			if (body.newPassword !== body.confirmPassword) {
				return status(400, failure({ message: "Passwords do not match" }));
			}

			const passwordHash = await Bun.password.hash(body.newPassword);
			await db.update(users).set({ passwordHash }).where(eq(users.id, id));

			return success({ message: "Password changed successfully" });
		},
		{
			private: ["admin"],
			params: RequestWithId(),
			body: ChangePasswordRequest,
		},
	);
