import { failure, success } from "@jawit/common";
import db from "@manager/db";
import { deviceTemplates } from "@manager/db/schema/device-template";
import auth from "@manager/services/http/middlewares/auth";
import { cache } from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { getAffectedCount } from "@manager/utils/db";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { UpdateDeviceTemplateRequest } from "@vlab/shared/schemas/device-template";
import { eq } from "drizzle-orm";

export default createRouter()
	.use(auth)
	.put(
		"/:id",
		async ({ params: { id }, body, status, entity: { label, key } }) => {
			const relatedNodes = await db.query.labSessionNodes.findMany({
				where: (n, { eq }) => eq(n.deviceTemplateId, id),
				columns: { id: true, labSessionId: true },
				with: {
					labSession: { columns: { labId: true } },
				},
			});

			const rowCount = await getAffectedCount(
				db
					.update(deviceTemplates)
					.set(body)
					.where(eq(deviceTemplates.id, id))
					.$dynamic(),
			);

			if (rowCount) {
				const nodeKeys = relatedNodes.map(
					(n) =>
						`lab:${n.labSession.labId}:lab-session:${n.labSessionId}:node:${n.id}`,
				);

				await cache.delete(`${key}:list`, `${key}:${id}`, ...nodeKeys);

				return success({ message: `${label} updated` });
			} else return status(404, failure({ message: `${label} not found` }));
		},
		{
			private: ["admin"],
			params: RequestWithId(),
			body: UpdateDeviceTemplateRequest,
		},
	);
