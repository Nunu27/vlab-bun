import db from "@/db";
import env from "@/env";
import { AppWithServices } from "@/services";
import redis from "@/services/redis";
import { failure, success } from "@/utils/response";
import { status, t } from "elysia";

const LoginRequest = t.Object({
	email: t.String({ format: "email" }),
	password: t.String({
		minLength: 8,
		maxLength: 128
	})
});

export default (app: AppWithServices) =>
	app.post(
		"/login",
		async ({ sessionId, body }) => {
			const user = await db.query.users.findFirst({
				where: (user, { eq }) => eq(user.email, body.email),
				columns: { passwordHash: true, id: true, role: true }
			});

			if (!user) {
				return status(404, failure({ message: "User not found" }));
			} else if (await Bun.password.verify(body.password, user.passwordHash)) {
				const session = {
					id: user.id,
					role: user.role
				};
				await redis.set(sessionId, session, env.SESSION_TTL);
				return success({ data: session, message: "Login successful" });
			} else {
				return status(401, failure({ message: "Invalid password" }));
			}
		},
		{
			guest: true,
			body: LoginRequest,
			detail: {
				description: "Login with email and password"
			}
		}
	);
