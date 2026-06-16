import { success } from "@jawit/common";
import db from "@manager/db";
import caching from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";

export default createRouter()
	.use(caching)
	.guard({ cached: true, protected: true }, (app) => {
		return app
			.resolve(({ ENTITY: { KEY }, cache }) => cache.set(`${KEY}:list`))
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
								resources: true,
								connection: true,
							},
						},
					},
				});

				return success({ data });
			});
	});
