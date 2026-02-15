import db from "@api/db";
import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { success } from "@jawit/common";

export default createRouter()
	.use(caching)
	.guard({ cached: true, protected: true }, (app) => {
		return app
			.resolve(({ entity: { key } }) => ({ cacheKey: `${key}:list` }))
			.get("/list", async () => {
				const data = await db.query.deviceCategories.findMany({
					columns: { id: true, name: true, color: true },
					with: {
						templates: {
							columns: {
								id: true,
								name: true,
								icon: true,
								interfaces: true,
								kind: true,
							},
						},
					},
				});

				return success({ data });
			});
	});
