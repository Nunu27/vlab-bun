import { failure, success } from "@jawit/common";
import db from "@manager/db";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { LoginRequest } from "@vlab/shared/schemas/auth";

export default createRouter()
	.use(auth)
	.post(
		"/login",
		async ({ session, body, status }) => {
			const user = await db.query.users.findFirst({
				where: (user, { eq }) => eq(user.email, body.email),
				columns: { passwordHash: true, id: true, role: true },
			});

			if (!user) {
				return status(404, failure({ message: "User not found" }));
			} else if (!user.passwordHash) {
				return status(401, failure({ message: "Please login using CAS" }));
			} else if (await Bun.password.verify(body.password, user.passwordHash)) {
				await session.set({
					id: user.id,
					role: user.role,
				});
				return success({ message: "Login successful" });
			} else {
				return status(401, failure({ message: "Invalid password" }));
			}
		},
		{ guest: true, body: LoginRequest },
	);
