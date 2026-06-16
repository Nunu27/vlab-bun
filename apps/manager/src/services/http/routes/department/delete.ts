import { responses } from "@jawit/common";
import db from "@manager/db";
import { departments } from "@manager/db/schema/auth";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.delete(
		"/:id",
		async ({ params: { id }, status, ENTITY: { LABEL: label } }) => {
			const rowCount = await getAffectedCount(
				db.delete(departments).where(eq(departments.id, id)).$dynamic(),
			);

			if (rowCount) {
				return responses.deleted(label);
			} else return status(404, responses.notFound(label));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
		},
	);
