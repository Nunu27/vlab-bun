import db from "@backend/db";
import { createRouter } from "@backend/plugins/services";
import { md5 } from "@backend/utils/crypto";
import { createPaginator } from "@backend/utils/paginator";
import { success } from "@backend/utils/response";

const paginator = createPaginator(db, "labs", {
	searchableColumns: ["name"]
});

export default createRouter().guard(
	{
		private: ["student", "lecturer"],
		query: paginator.schema,
		cached: { personalized: true },
		detail: {
			description: "Get paginated labs data"
		}
	},
	(app) =>
		app
			.resolve(({ query }) => ({
				cacheKey: `lab:pagination:${md5(JSON.stringify(query))}`
			}))
			.get("/pagination", async ({ query, session }) => {
				const data = await paginator.paginate(query, {
					columns: {
						topology: false
					},
					with: {
						author: {
							columns: { id: true },
							with: {
								user: {
									columns: {
										name: true
									}
								}
							}
						},
						sessions: {
							limit: 1,
							columns: {
								id: true
							},
							where: (sessions, { eq }) => eq(sessions.ownerId, session.data.id)
						}
					}
				});

				return success({
					data: {
						...data,
						items: data.items.map(
							({ author: { user, ...author }, sessions, ...item }) => ({
								...item,
								author: {
									...user,
									...author
								},
								sessionId: sessions.at(0)?.id
							})
						)
					}
				});
			})
);
