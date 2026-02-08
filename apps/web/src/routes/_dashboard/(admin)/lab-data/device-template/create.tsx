import { createFileRoute } from "@tanstack/react-router";
import { PageHeading } from "@web/components/sections/page-heading";
import { privateRoute } from "@web/lib/middlewares";

export const Route = createFileRoute(
	"/_dashboard/(admin)/lab-data/device-template/create",
)({
	staticData: {
		breadcrumbs: [
			{ title: "Lab Data" },
			{ title: "Device Template", url: "/lab-data/device-template" },
			{ title: "Create Template" },
		],
	},
	beforeLoad: privateRoute(["admin"]),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="space-y-4">
			<PageHeading
				title="Create Device Template"
				subtitle="Set up a new template for virtual lab devices."
			/>
			<div className="p-4 border border-dashed rounded-lg bg-muted/20 text-center text-muted-foreground w-full py-20">
				Future template creation interface goes here...
			</div>
		</div>
	);
}
