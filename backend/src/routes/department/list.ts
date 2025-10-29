import { createAppWithServices } from "@backend/plugins/services";
import { success } from "@backend/utils/response";

export default createAppWithServices().get(
	"/list",
	async ({ db }) => {
		const data = await db.query.departments.findMany({
			columns: {
				createdAt: false,
				updatedAt: false
			}
		});

		return success({
			data
		});
	},
	{
		cached: { key: "department:list" },
		private: ["admin"],
		detail: {
			description: "Get department list"
		}
	}
);
