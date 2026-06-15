import { failure, success } from "@jawit/common";
import db from "@manager/db";
import guacamole from "@manager/services/guacamole-lite";
import caching from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import { RequestWithId } from "@vlab/shared/schemas/common";

export default createRouter()
	.use(caching)
	.guard(
		{
			cached: true,
			private: ["student"],
			params: RequestWithId(["labId", "labSessionId", "id"]),
		},
		(app) => {
			return app
				.resolve(({ params: { id, labId, labSessionId }, cache }) =>
					cache.set(`lab:${labId}:lab-session:${labSessionId}:node:${id}`),
				)
				.get(
					"/:labSessionId/node/:id",
					async ({ params: { id, labId, labSessionId }, status }) => {
						const node = await db.query.labSessionNodes.findFirst({
							where: (n, { eq }) => eq(n.id, id),
							columns: { id: true, name: true, health: true, ip: true },
							with: {
								deviceTemplate: { columns: { connection: true, kind: true } },
								labSession: {
									columns: { id: true, labId: true },
									with: {
										worker: { columns: { guacdHost: true, guacdPort: true } },
									},
								},
							},
						});
						if (!node) {
							return status(404, failure({ message: "Node not found" }));
						}

						const { ip, deviceTemplate, labSession, ...nodeData } = node;

						if (labSession.id !== labSessionId || labSession.labId !== labId) {
							return status(404, failure({ message: "Node not found" }));
						}

						const {
							type,
							data: { port, ...credentials },
						} = deviceTemplate.connection;

						if (!labSession.worker) {
							return status(500, failure({ message: "Worker not found" }));
						}

						if (deviceTemplate.kind === "mikrotik_ros") {
							credentials.username += "t";
						}

						return success({
							data: {
								...nodeData,
								token: guacamole.generateToken({
									type,
									guacdHost: labSession.worker.guacdHost,
									guacdPort: labSession.worker.guacdPort,
									settings: {
										hostname: ip,
										port: port.toString(),
										...credentials,
									},
								}),
							},
						});
					},
				);
		},
	);
