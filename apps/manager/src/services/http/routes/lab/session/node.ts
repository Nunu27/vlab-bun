import { failure, success } from "@jawit/common";
import db from "@manager/db";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { RequestWithId } from "@vlab/shared/schemas/common";
import { t } from "elysia";

export default createRouter()
	.use(auth)
	.get(
		"/:labSessionId/node/:id",
		async ({ params: { id, labId, labSessionId }, status }) => {
			const node = await db.query.labSessionNodes.findFirst({
				where: (n, { eq }) => eq(n.id, id),
				columns: { id: true, name: true, health: true, token: true },
				with: {
					labSession: { columns: { id: true, labId: true } },
				},
			});
			if (!node) {
				return status(404, failure({ message: "Node not found" }));
			}

			const { labSession, token, ...nodeData } = node;

			if (labSession.id !== labSessionId || labSession.labId !== labId) {
				return status(404, failure({ message: "Node not found" }));
			}

			if (!token) {
				return status(500, failure({ message: "Node connection not ready" }));
			}

			return success({ data: { ...nodeData, token } });
		},
		{
			private: ["student"],
			params: t.Object({
				...RequestWithId(["labId", "labSessionId"]).properties,
				id: t.String(),
			}),
		},
	);
