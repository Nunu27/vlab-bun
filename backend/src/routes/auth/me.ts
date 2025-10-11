import { AppWithServices } from "@/services";
import { failure, success } from "@/utils/response";

export default (app: AppWithServices) =>
	app.get(
		"/me",
		async ({ session, db, status }) => {
			const user = await db.query.users.findFirst({
				where: (user, { eq }) => eq(user.id, session.id),
				columns: { passwordHash: false }
			});

			if (!user) return status(404, failure({ message: "User not found" }));
			return success({ data: user });
		},
		{ protected: true, detail: { description: "Get current logged in user" } }
	);
