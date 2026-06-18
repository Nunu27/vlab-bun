import { createFileRoute, Link } from "@tanstack/react-router";
import { DataTable } from "@web/components/data-table";
import { PageHeading } from "@web/components/sections/page-heading";
import { Button } from "@web/components/ui/button";
import { useApiPagination } from "@web/hooks/pagination/use-api-pagination";
import api from "@web/lib/api";
import { PlusIcon } from "lucide-react";
import { topologyTemplateColumns } from "./-module/columns";
import { DeleteTopologyTemplateModal } from "./-module/components/modals/delete-topology-template-modal";
import { TopologyTemplateModalProvider } from "./-module/stores/topology-template-modal-store";

export const Route = createFileRoute(
	"/_dashboard/_instructor/topology-template/",
)({
	staticData: {
		breadcrumbs: [{ title: "Topology Templates" }],
	},
	component: RouteComponent,
});

function RouteComponent() {
	const pagination = useApiPagination(api["topology-template"].pagination);

	return (
		<TopologyTemplateModalProvider>
			<div className="space-y-4">
				<PageHeading
					title="Topology Templates"
					subtitle="Manage reusable network topologies."
					actions={
						<Button asChild>
							<Link to="/topology-template/create">
								<PlusIcon className="mr-2 h-4 w-4" />
								Create Template
							</Link>
						</Button>
					}
				/>
				<DataTable
					pagination={pagination}
					columns={topologyTemplateColumns}
					searchPlaceholder="Search by template name..."
				/>
			</div>

			<DeleteTopologyTemplateModal />
		</TopologyTemplateModalProvider>
	);
}
