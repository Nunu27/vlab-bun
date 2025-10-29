import { createAppWithServices } from "@backend/plugins/services";
import { success } from "@backend/utils/response";

export default createAppWithServices().post(
	"/logout",
	async ({ sessionId, redis }) => {
		await redis.del(sessionId);

		return success({ message: "Logout successful" });
	},
	{
		protected: true,
		detail: {
			description: "Logout and invalidate the current session"
		}
	}
);
