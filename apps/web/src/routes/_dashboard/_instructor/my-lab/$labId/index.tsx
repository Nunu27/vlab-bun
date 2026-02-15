import { createFileRoute } from "@tanstack/react-router";
import api from "@web/lib/api";
import { queryClient } from "@web/lib/query";
import { DeleteLabModal } from "../-module/components/modals/delete-lab-modal";
import { LabModalProvider } from "../-module/stores/lab-modal-store";
import LabDetailPage from "./-module/pages/lab-detail-page";

export const Route = createFileRoute("/_dashboard/_instructor/my-lab/$labId/")({
	staticData: {
		breadcrumbs: [
			{ title: "My Lab", url: "/my-lab" },
			{ title: (data) => data.get("name") ?? "..." },
		],
	},
	loader: async ({ params: { labId }, context }) => {
		const { name } = await api.lab({ labId }).get.ensureQueryData(queryClient);
		context.breadcrumbData.set("name", name);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { labId } = Route.useParams();

	return (
		<LabModalProvider>
			<LabDetailPage labId={labId} />

			<DeleteLabModal />
		</LabModalProvider>
	);
}
