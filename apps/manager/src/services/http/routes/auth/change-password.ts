import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { users } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { AuthChangePasswordRequest } from "@vlab/shared/schemas/auth";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.post(
		"/change-password",
		async ({ session, body, status }) => {
			const userId = session.data.id;

			const user = await db.query.users.findFirst({
				where: (user, { eq }) => eq(user.id, userId),
				columns: { passwordHash: true },
			});
			if (!user) return status(404, failure({ message: "User not found" }));

			if (user.passwordHash) {
				if (!body.oldPassword) {
					return status(400, failure({ message: "Old password is required" }));
				}

				const isPasswordCorrect = await Bun.password.verify(
					body.oldPassword,
					user.passwordHash,
				);
				if (!isPasswordCorrect) {
					return status(400, failure({ message: "Old password is incorrect" }));
				}
			}

			if (body.newPassword !== body.confirmPassword) {
				return status(400, failure({ message: "Passwords do not match" }));
			}

			user.passwordHash = await Bun.password.hash(body.newPassword);
			await db
				.update(users)
				.set({ passwordHash: user.passwordHash })
				.where(eq(users.id, userId));

			return success({ message: "Password changed successfully" });
		},
		{
			protected: true,
			body: AuthChangePasswordRequest,
		},
	);
