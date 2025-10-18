import { AppWithServices } from "@/plugins/services";
import { success } from "@/utils/response";

export default (app: AppWithServices) =>
	app.get(
		"/list",
		async ({ db }) => {
			const data = await db.query.departments.findMany();

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
