import db from "@/db";
import { AppWithServices } from "@/services";
import { md5 } from "@/utils/hash";
import { createPaginator } from "@/utils/paginator";
import { success } from "@/utils/response";

const paginator = createPaginator(db, "students");

export default (app: AppWithServices) =>
	app.guard(
		{
			private: ["admin"],
			body: paginator.schema
		},
		(app) =>
			app
				.resolve(({ body }) => ({
					cacheKey: `student:pagination:${md5(JSON.stringify(body))}`
				}))
				.post(
					"/pagination",
					async ({ body }) => {
						const data = await paginator.paginate(body, {
							columns: {
								studyProgramId: false
							},
							with: {
								user: {
									columns: {
										name: true,
										email: true
									}
								},
								studyProgram: {
									columns: {
										id: true,
										name: true
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
					{ body: paginator.schema }
				)
	);
