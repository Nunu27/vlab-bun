import env from "@backend/env";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";

const casUrl = new URL(env.CAS_BASE_URL);
casUrl.searchParams.set("url", `${env.BASE_URL}/login`);

casUrl.pathname = "/cas/logout";

const casLogoutUrl = casUrl.toString();

export default createRouter().post(
	"/logout",
	async ({ session }) => {
		await session.delete();

		return success({
			message: "Logout successful",
			data: session.data.useCAS ? casLogoutUrl : undefined
		});
	},
	{
		protected: true,
		detail: {
			description: "Logout and invalidate the current session"
		}
	}
);
