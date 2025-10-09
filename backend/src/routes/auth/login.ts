import { eq } from "drizzle-orm";
import { status, t } from "elysia";
import db from "../../db";
import { users } from "../../db/schema";
import { App } from "../../services";
import redis from "../../services/redis";
import { failure, success } from "../../utils/response";

const LoginRequest = t.Object({
	email: t.String({ format: "email" }),
	password: t.String({
		minLength: 8,
		maxLength: 128
	})
});

export default (app: App) =>
	app.post(
		"/login",
		async ({ cookie, body }) => {
			const user = await db.query.users.findFirst({
				where: eq(users.email, body.email)
			});

			if (!user) {
				return status(404, failure({ message: "User not found" }));
			} else if (await Bun.password.verify(body.password, user.passwordHash)) {
				const session = {
					id: user.id,
					role: user.role
				};
				await redis.set(cookie.session.value!, session, 60 * 60 * 24 * 7);
				return success({ data: session, message: "Login successful" });
			} else {
				return status(401, failure({ message: "Invalid password" }));
			}
		},
		{
			body: LoginRequest,
			guest: true
		}
	);
