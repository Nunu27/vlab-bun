import { createFileRoute } from "@tanstack/react-router";
import { PageHeading } from "@web/components/sections/page-heading";
import { privateRoute } from "@web/lib/middlewares";

export const Route = createFileRoute(
	"/_dashboard/(admin)/lab-data/device-template/$deviceTemplateId/edit",
)({
	staticData: {
		breadcrumbs: [
			{ title: "Lab Data" },
			{ title: "Device Template", url: "/lab-data/device-template" },
			{ title: "Edit Template" },
		],
	},
	beforeLoad: privateRoute(["admin"]),
	component: RouteComponent,
});

function RouteComponent() {
	const { deviceTemplateId } = Route.useParams();
	return (
		<div className="space-y-4">
			<PageHeading
				title="Edit Device Template"
				subtitle={`Modify configuration for template ID: ${deviceTemplateId}`}
			/>
			<div className="p-4 border border-dashed rounded-lg bg-muted/20 text-center text-muted-foreground w-full py-20">
				Future template modification interface goes here...
			</div>
		</div>
	);
}
