import { responses, success } from "@jawit/common";
import { createPaginator } from "@jawit/paginator";
import db from "@manager/db";
import { topologyTemplates } from "@manager/db/schema/topology-template";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { TopologyTemplateRequestSchema } from "@vlab/shared/schemas/topology-template";
import { eq } from "drizzle-orm";

const { paginate, schema: paginationSchema } = createPaginator(
	db,
	"topologyTemplates",
	{
		searchableColumns: ["name"],
		usableColumns: ["name", "createdAt", "updatedAt"],
	},
);

export default createRouter({
	prefix: "/topology-template",
	detail: { tags: ["Topology Template"] },
})
	.use(auth)
	.post(
		"/pagination",
		async ({ body }) => {
			const data = await paginate(body, {});
			return success({ data });
		},
		{
			private: ["admin", "instructor"],
			body: paginationSchema,
		},
	)
	.get(
		"/:id",
		async ({ params: { id }, ENTITY: { LABEL: label } }) => {
			const template = await db.query.topologyTemplates.findFirst({
				where: (t, { eq }) => eq(t.id, id),
			});
			if (!template) throw responses.notFound(label);
			return success({ data: template });
		},
		{ private: ["admin", "instructor"] },
	)
	.post(
		"/",
		async ({ body, ENTITY: { LABEL: label } }) => {
			const [{ id }] = await db
				.insert(topologyTemplates)
				.values(body)
				.returning({ id: topologyTemplates.id });
			return responses.created(label, { id });
		},
		{
			private: ["admin", "instructor"],
			body: TopologyTemplateRequestSchema,
		},
	)
	.put(
		"/:id",
		async ({ params: { id }, body, ENTITY: { LABEL: label } }) => {
			const [updated] = await db
				.update(topologyTemplates)
				.set(body)
				.where(eq(topologyTemplates.id, id))
				.returning({ id: topologyTemplates.id });
			if (!updated) throw responses.notFound(label);
			return responses.updated(label);
		},
		{
			private: ["admin", "instructor"],
			body: TopologyTemplateRequestSchema,
		},
	)
	.delete(
		"/:id",
		async ({ params: { id }, ENTITY: { LABEL: label } }) => {
			const [deleted] = await db
				.delete(topologyTemplates)
				.where(eq(topologyTemplates.id, id))
				.returning({ id: topologyTemplates.id });
			if (!deleted) throw responses.notFound(label);
			return responses.deleted(label);
		},
		{ private: ["admin", "instructor"] },
	);
