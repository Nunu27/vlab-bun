import db from "@/db";
import { AppWithServices } from "@/services";
import { createPaginator } from "@/utils/paginator";
import { success } from "@/utils/response";

const paginator = createPaginator(db, "lecturers");

export default (app: AppWithServices) =>
	app.post(
		"/pagination",
		async ({ body }) => {
			const data = await paginator.paginate(body, {
				with: {
					user: {
						columns: {
							name: true,
							email: true
						}
					}
				}
			});

			return success({
				data: {
					...data,
					items: data.items.map(({ user, ...item }) => ({
						...item,
						...user
					}))
				}
			});
		},
		{
			private: ["admin"],
			body: paginator.schema
		}
	);
