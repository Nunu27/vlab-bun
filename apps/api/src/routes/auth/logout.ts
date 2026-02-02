import env from "@api/env";
import auth from "@api/middlewares/auth";
import { success } from "@jawit/common";
import Elysia from "elysia";

const CAS_LOGOUT_URL = `${env.CAS_BASE_URL}/cas/logout?url=${encodeURIComponent(`${env.BASE_URL}/login`)}`;

export default new Elysia().use(auth).post(
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
