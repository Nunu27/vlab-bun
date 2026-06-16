import { responses } from "@jawit/common";
import db from "@manager/db";
import { departments } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { CreateDepartmentRequest } from "@vlab/shared/schemas/department";

export default createRouter()
	.use(auth)
	.post(
		"/",
		async ({ body, ENTITY: { LABEL: label } }) => {
			const [{ id }] = await db
				.insert(departments)
				.values(body)
				.returning({ id: departments.id });

			return responses.created(label, { id });
		},
		{
			private: ["admin"],
			body: CreateDepartmentRequest,
		},
	);
