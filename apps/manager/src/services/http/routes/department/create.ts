import { success } from "@jawit/common";
import db from "@manager/db";
import { departments } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { CreateDepartmentRequest } from "@vlab/shared/schemas/department";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, entity: { label, key } }) => {
			const [{ id }] = await db
				.insert(departments)
				.values(body)
				.returning({ id: departments.id });
			await cache.delete(`${key}:pagination:*`);

			return success({ message: `${label} created`, data: { id } });
		},
		{
			private: ["admin"],
			body: CreateDepartmentRequest,
		},
	);
