import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	type TopologyTemplateRequest,
	TopologyTemplateRequestSchema,
} from "@vlab/shared/schemas/topology-template";
import { PageHeading } from "@web/components/sections/page-heading";
import { Button } from "@web/components/ui/button";
import { useApiForm } from "@web/hooks/form/use-api-form";
import api from "@web/lib/api";
import { queryClient } from "@web/lib/query";
import { TopologyStoreProvider } from "@web/shared/topology/stores";
import { HelpCircleIcon } from "lucide-react";
import { TopologyTemplateForm } from "../-module/components/forms/topology-template-form";
import { useTopologyTemplateTour } from "../-module/onboarding/use-topology-template-tour";

const validator = Compile(TopologyTemplateRequestSchema);

export const Route = createFileRoute(
	"/_dashboard/_instructor/topology-template/$templateId/",
)({
	staticData: {
		breadcrumbs: [
			{
				title: "Topology Templates",
				url: "/topology-template",
			},
			{
				title: "Edit",
			},
		],
	},
	loader: async ({ params: { templateId } }) => {
		await Promise.all([
			api["device-template"].list.get.ensureQueryData(queryClient),
			api["topology-template"]({ id: templateId }).get.ensureQueryData(
				queryClient,
			),
		]);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { templateId } = Route.useParams();

	const { start: startTour } = useTopologyTemplateTour();

	const { data: categorizedTemplates } =
		api["device-template"].list.get.useSuspenseQuery();

	const { data: template } = api["topology-template"]({
		id: templateId,
	}).get.useSuspenseQuery();

	const form = useApiForm(api["topology-template"]({ id: templateId }).put, {
		defaultValues: {
			name: template.name,
			topology: template.topology,
		} as unknown as TopologyTemplateRequest,
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: () => {
				api["topology-template"].pagination.post.invalidateQuery(queryClient);
				api["topology-template"]({ id: templateId }).get.invalidateQuery(
					queryClient,
				);
				navigate({ to: "/topology-template" });
			},
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
		>
			<div className="space-y-6 pb-8">
				<PageHeading
					title="Edit Topology Template"
					subtitle="Modify reusable network topology"
					back={{ to: "/topology-template" }}
					actions={
						<Button type="button" variant="ghost" size="sm" onClick={startTour}>
							<HelpCircleIcon className="mr-2 h-4 w-4" />
							Take a Tour
						</Button>
					}
				/>

				<TopologyStoreProvider
					isEditor
					categorizedTemplates={categorizedTemplates}
					topology={template.topology}
				>
					<TopologyTemplateForm form={form as never} />
				</TopologyStoreProvider>

				<div className="flex justify-end gap-4">
					<Button type="button" variant="outline" asChild>
						<Link to="/topology-template">Cancel</Link>
					</Button>
					<form.AppForm>
						<form.SubmitButton label="Save Changes" />
					</form.AppForm>
				</div>
			</div>
		</form>
	);
}
