import { success } from "@jawit/common";
import env from "@manager/env";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";

const CAS_LOGOUT_URL = `${env.CAS_BASE_URL}/cas/logout?url=${encodeURIComponent(`${env.BASE_URL}/login`)}`;

export default createRouter()
	.use(auth)
	.post(
		"/logout",
		async ({ session }) => {
			await session.delete();

			return success({
				message: "Logout successful",
				data: session.data.useCAS ? CAS_LOGOUT_URL : undefined,
			});
		},
		{ protected: true },
	);
