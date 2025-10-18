import { AppWithServices } from "@/plugins/services";
import redis from "@/services/redis";
import { success } from "@/utils/response";

export default (app: AppWithServices) =>
	app.post(
		"/logout",
		async ({ sessionId }) => {
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
