import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LabRequestSchema, type LabTopology } from "@vlab/shared/schemas";
import type { DateRange } from "@vlab/shared/schemas/common";
import { PageHeading } from "@web/components/sections/page-heading";
import { Button } from "@web/components/ui/button";
import { useApiForm } from "@web/hooks/form/use-api-form";
import api from "@web/lib/api";
import { queryClient } from "@web/lib/query";
import { TopologyStoreProvider } from "@web/shared/topology/stores";
import { LabForm } from "./-module/components/forms/lab-form";

const validator = Compile(LabRequestSchema);

export const Route = createFileRoute("/_dashboard/_instructor/my-lab/create")({
	staticData: {
		breadcrumbs: [
			{
				title: "My Lab",
				url: "/my-lab",
			},
			{
				title: "Create",
			},
		],
	},
	loader: async () => {
		await Promise.all([
			api["device-template"].list.get.ensureQueryData(queryClient),
			api.evaluator.list.get.ensureQueryData(queryClient),
		]);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data: categorizedTemplates } =
		api["device-template"].list.get.useSuspenseQuery();

	const form = useApiForm(api.lab.post, {
		defaultValues: {
			name: "",
			content: "",
			isPublished: false,
			sessionDuration: 180,
			attachments: [],
			instructions: "",
			checks: {},
			topology: {} as LabTopology,
			date: {} as DateRange,
		},
		validators: { onSubmit: validator },
		mutation: {
			onSuccess: ({ id }) => {
				api.lab.pagination.post.invalidateQuery(queryClient);
				navigate({
					to: "/my-lab/$labId",
					params: { labId: id },
					replace: true,
				});
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
					title="Create Lab"
					subtitle="Design your network topology"
					back={{ to: "/my-lab" }}
				/>

				<TopologyStoreProvider
					isEditor
					categorizedTemplates={categorizedTemplates}
				>
					<LabForm form={form as never} />
				</TopologyStoreProvider>

				<div className="flex justify-end gap-4">
					<Button type="button" variant="outline" asChild>
						<Link to="/my-lab">Cancel</Link>
					</Button>
					<form.AppForm>
						<form.SubmitButton label="Create" />
					</form.AppForm>
				</div>
			</div>
		</form>
	);
}
