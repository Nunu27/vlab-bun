import { createAppWithServices } from "@backend/plugins/services";
import { success } from "@backend/utils/response";

export default createAppWithServices().get(
	"/list",
	async ({ db }) => {
		const data = await db.query.studyPrograms.findMany({
			columns: { departmentId: false, createdAt: false, updatedAt: false },
			with: {
				department: {
					columns: {
						id: true,
						name: true
					}
				}
			}
		});

		return success({
			data
		});
	},
	{
		cached: { key: "study-program:list" },
		private: ["admin"],
		detail: {
			description: "Get study program list"
		}
	}
);
