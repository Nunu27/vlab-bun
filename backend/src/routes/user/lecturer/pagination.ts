import db from "@/db";
import { AppWithServices } from "@/plugins/services";
import { md5 } from "@/utils/crypto";
import { createPaginator } from "@/utils/paginator";
import { success } from "@/utils/response";

const paginator = createPaginator(db, "lecturers", {
	searchableColumns: ["nip"]
});

export default (app: AppWithServices) =>
	app.guard(
		{
			cached: true,
			private: ["admin"],
			body: paginator.schema,
			detail: {
				description: "Get paginated lecturers data"
			}
		},
		(app) =>
			app
				.resolve(({ body }) => ({
					cacheKey: `lecturer:pagination:${md5(JSON.stringify(body))}`
				}))
				.post(
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
					{ body: paginator.schema }
				)
	);
