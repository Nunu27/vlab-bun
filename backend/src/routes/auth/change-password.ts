import db from "@/db";
import { users } from "@/db/schema/auth";
import { AppWithServices } from "@/plugins/services";
import redis from "@/services/redis";
import { failure, success } from "@/utils/response";
import { eq } from "drizzle-orm";
import { t } from "elysia";

const ChangePasswordRequest = t.Object({
	oldPassword: t.String({
		minLength: 8,
		maxLength: 128
	}),
	newPassword: t.String({
		minLength: 8,
		maxLength: 128
	}),
	confirmPassword: t.String({
		minLength: 8,
		maxLength: 128
	})
});

export default (app: AppWithServices) =>
	app.post(
		"/change-password",
		async ({ session, body, status }) => {
			const user = await db.query.users.findFirst({
				where: (user, { eq }) => eq(user.id, session.id),
				columns: { passwordHash: true }
			});

			if (!user) return status(404, failure({ message: "User not found" }));
			if (await Bun.password.verify(body.oldPassword, user.passwordHash)) {
				if (body.newPassword !== body.confirmPassword) {
					return status(400, failure({ message: "Passwords do not match" }));
				}

				user.passwordHash = await Bun.password.hash(body.newPassword);
				await db
					.update(users)
					.set({ passwordHash: user.passwordHash })
					.where(eq(users.id, session.id));
				await redis.del(session.id);
				return success({ message: "Password changed successfully" });
			} else {
				return status(400, failure({ message: "Old password is incorrect" }));
			}
		},
		{
			protected: true,
			body: ChangePasswordRequest,
			detail: {
				description: "Change password for logged in user"
			}
		}
	);
