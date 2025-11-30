import env from "@backend/env";
import { createRouter } from "@backend/plugins/services";
import { success } from "@backend/utils/response";

export default createRouter().post(
	"/logout",
	async ({ session }) => {
		await session.delete();
		let data: string | undefined;

		if (session.data.useCAS) {
			const casUrl = new URL(env.CAS_BASE_URL);
			casUrl.searchParams.set("url", `${env.BASE_URL}/login`);

			casUrl.pathname = "/cas/logout";

			data = casUrl.toString();
		}

		return success({
			message: "Logout successful",
			data
		});
	},
	{
		protected: true,
		detail: {
			description: "Logout and invalidate the current session"
		}
	}
);
