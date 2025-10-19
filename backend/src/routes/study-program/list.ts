import { AppWithServices } from "@/plugins/services";
import { success } from "@/utils/response";

export default (app: AppWithServices) =>
	app.get(
		"/list",
		async ({ db }) => {
			const data = await db.query.studyPrograms.findMany({
				columns: { departmentId: false },
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
