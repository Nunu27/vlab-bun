import { createFileRoute, Link } from "@tanstack/react-router";
import { DataTable } from "@web/components/data-table";
import { PageHeading } from "@web/components/sections/page-heading";
import { Button } from "@web/components/ui/button";
import { useApiPagination } from "@web/hooks/pagination/use-api-pagination";
import api from "@web/lib/api";
import { PlusIcon } from "lucide-react";
import { labColumns } from "./-module/columns";
import { DeleteLabModal } from "./-module/components/modals/delete-lab-modal";
import { LabModalProvider } from "./-module/stores/lab-modal-store";

export const Route = createFileRoute("/_dashboard/_instructor/my-lab/")({
	staticData: {
		breadcrumbs: [{ title: "My Labs" }],
	},
	component: RouteComponent,
});

function RouteComponent() {
	const pagination = useApiPagination(api.lab.pagination);

	return (
		<LabModalProvider>
			<div className="space-y-4">
				<PageHeading
					title="My Labs"
					subtitle="Manage labs you have created."
					actions={
						<Button asChild>
							<Link to="/my-lab/create">
								<PlusIcon className="mr-2 h-4 w-4" />
								Create Lab
							</Link>
						</Button>
					}
				/>
				<DataTable
					pagination={pagination}
					columns={labColumns}
					searchPlaceholder="Search by lab name..."
				/>
			</div>

			<DeleteLabModal />
		</LabModalProvider>
	);
}
