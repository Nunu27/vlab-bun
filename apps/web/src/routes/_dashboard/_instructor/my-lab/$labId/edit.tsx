import { Compile } from "@sinclair/typemap";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LabRequestSchema } from "@vlab/shared/schemas";
import { PageHeading } from "@web/components/sections/page-heading";
import { Button } from "@web/components/ui/button";
import { useApiForm } from "@web/hooks/form/use-api-form";
import api from "@web/lib/api";
import { queryClient } from "@web/lib/query";
import { TopologyStoreProvider } from "@web/shared/topology/stores";
import { toast } from "sonner";
import { LabForm } from "../-module/components/forms/lab-form";

const validator = Compile(LabRequestSchema);

export const Route = createFileRoute(
	"/_dashboard/_instructor/my-lab/$labId/edit",
)({
	staticData: {
		breadcrumbs: [
			{ title: "My Lab", url: "/my-lab" },
			{ title: (data) => data.get("name") ?? "...", url: "../" },
			{ title: "Edit" },
		],
	},
	loader: async ({ params: { labId }, context }) => {
		const [{ name }] = await Promise.all([
			api.lab({ labId }).get.ensureQueryData(queryClient),
			api["device-template"].list.get.ensureQueryData(queryClient),
			api.evaluator.list.get.ensureQueryData(queryClient),
		]);

		context.breadcrumbData.set("name", name);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { labId } = Route.useParams();
	const navigate = useNavigate();
	const { data: lab } = api.lab({ labId }).get.useSuspenseQuery();
	const { data: categorizedTemplates } =
		api["device-template"].list.get.useSuspenseQuery();

	const client = useQueryClient();
	const form = useApiForm(api.lab({ labId }).put, {
		defaultValues: {
			name: lab.name,
			content: lab.content,
			cover: lab.cover ?? undefined,
			isPublished: lab.isPublished,
			sessionDuration: lab.sessionDuration,
			date: lab.date,
			maxAttempt: lab.maxAttempt ?? undefined,
			attachments: lab.attachments,
			instructions: lab.instructions,
			checks: lab.checks,
			topology: lab.topology,
		},
		validators: { onSubmit: validator },
		onSubmitInvalid: () => {
			toast.error("Validation failed", {
				description: "Please check all required fields",
			});
		},
		mutation: {
			onSuccess: () => {
				client.invalidateQueries({ queryKey: ["lab", "pagination"] });
				client.invalidateQueries({ queryKey: ["lab", { labId }, "get"] });
				navigate({ to: "..", replace: true });
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
					title="Edit Lab"
					subtitle="Update lab settings and topology"
					back={{ to: "/my-lab" }}
				/>

				<TopologyStoreProvider
					isEditor
					categorizedTemplates={categorizedTemplates}
					topology={lab.topology}
				>
					<LabForm form={form} />
				</TopologyStoreProvider>

				<div className="flex justify-end gap-4">
					<Button type="button" variant="outline" asChild>
						<Link to="/my-lab">Cancel</Link>
					</Button>
					<form.AppForm>
						<form.SubmitButton label="Save" />
					</form.AppForm>
				</div>
			</div>
		</form>
	);
}
