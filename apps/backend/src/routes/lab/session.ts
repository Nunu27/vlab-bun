import db from "@backend/db";
import { labSessions, devices } from "@backend/db/schema";
import { LabSessionResponse } from "@vlab/shared/schemas";
import { eq, inArray } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { toKebabCase } from "@backend/utils/string";
import { createGuacamoleToken } from "@backend/utils/crypto";
import env from "@backend/env";

const sessionRoutes = new Elysia().get(
	"/session/:id",
	async ({ params: { id }, set }) => {
		const session = await db.query.labSessions.findFirst({
			where: eq(labSessions.id, id),
			with: {
				lab: true,
				nodes: true
			}
		});

		if (!session) {
			set.status = 404;
			throw new Error("Session not found");
		}

		if (!session.lab) {
			set.status = 404;
			throw new Error("Lab not found for this session");
		}

		// Fetch device templates
		const deviceIds = new Set(
			session.lab.topology.nodes
				.filter((n) => n.type === "device")
				.map((n) => n.deviceId)
		);

		const deviceTemplates =
			deviceIds.size > 0
				? await db.query.devices.findMany({
						where: inArray(devices.id, [...deviceIds])
				  })
				: [];
		const deviceMap = new Map(deviceTemplates.map((d) => [d.id, d]));

		// Map tokens to nodes
		const nodesWithTokens = session.lab.topology.nodes.map((node) => {
			if (node.type !== "device") return node;

			const deviceTemplate = deviceMap.get(node.deviceId);
			if (!deviceTemplate) return node;

			const nodeName = toKebabCase(node.label);
			const labNode = session.nodes.find((n) => n.name === nodeName);

			if (!labNode) return node;

			const internalPort = deviceTemplate.connection.data.port;
			const externalPort = labNode.ports[internalPort];

			if (!externalPort) return node;

			const token = createGuacamoleToken({
				connection: {
					type: deviceTemplate.connection.type,
					settings: {
						hostname: env.CLAB_HOST,
						port: externalPort.toString(),
						username: deviceTemplate.connection.data.username,
						password: deviceTemplate.connection.data.password
					}
				}
			});

			return {
				...node,
				token
			};
		});

		return {
			id: session.id,
			type: session.type,
			createdAt: session.createdAt.toISOString(),
			lab: {
				id: session.lab.id,
				name: session.lab.name,
				topology: {
					...session.lab.topology,
					nodes: nodesWithTokens
				}
			}
		};
	},
	{
		params: t.Object({
			id: t.String({ format: "uuid" })
		}),
		response: LabSessionResponse
	}
);

export default sessionRoutes;
