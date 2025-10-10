import { AppWithServices } from "@/services";
import redis from "@/services/redis";
import { success } from "@/utils/response";

export default (app: AppWithServices) =>
	app.post(
		"/logout",
		({ cookie }) => {
			redis.del(cookie.session.value!);

			return success({ message: "Logout successful" });
		},
		{ protected: true }
	);
