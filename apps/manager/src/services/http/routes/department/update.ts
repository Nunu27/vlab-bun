import { responses } from "@jawit/common";
import db from "@manager/db";
import { departments } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { UpdateDepartmentRequest } from "@vlab/shared/schemas/department";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.put(
		"/:id",
		async ({ params: { id }, body, status, ENTITY: { LABEL: label } }) => {
			const rowCount = await getAffectedCount(
				db
					.update(departments)
					.set(body)
					.where(eq(departments.id, id))
					.$dynamic(),
			);

			if (rowCount) {
				return responses.updated(label);
			} else return status(404, responses.notFound(label));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
			body: UpdateDepartmentRequest,
		},
	);
