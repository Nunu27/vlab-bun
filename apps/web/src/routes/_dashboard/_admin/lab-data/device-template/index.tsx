import { createFileRoute, Link } from "@tanstack/react-router";
import { DataTable } from "@web/components/data-table";
import { DataTableComboboxFilter } from "@web/components/data-table/data-table-combobox-filter";
import { PageHeading } from "@web/components/sections/page-heading";
import { Button } from "@web/components/ui/button";
import { useApiPagination } from "@web/hooks/pagination/use-api-pagination";
import api from "@web/lib/api";
import { PlusIcon } from "lucide-react";
import { deviceTemplateColumns } from "./-module/columns";
import { DeleteDeviceTemplateModal } from "./-module/components/modals/delete-device-template-modal";
import { DeviceTemplateModalProvider } from "./-module/stores/device-template-modal-store";

export const Route = createFileRoute(
	"/_dashboard/_admin/lab-data/device-template/",
)({
	staticData: {
		breadcrumbs: [{ title: "Lab Data" }, { title: "Device Template" }],
	},
	component: RouteComponent,
});

function RouteComponent() {
	const pagination = useApiPagination(api["device-template"].pagination);

	return (
		<DeviceTemplateModalProvider>
			<div className="space-y-4">
				<PageHeading
					title="Device Templates"
					subtitle="Manage device templates available to be used in labs."
					actions={
						<Button asChild>
							<Link to="/lab-data/device-template/create">
								<PlusIcon className="mr-2 h-4 w-4" />
								Create Template
							</Link>
						</Button>
					}
				/>
				<DataTable
					pagination={pagination}
					columns={deviceTemplateColumns}
					searchPlaceholder="Search by template name..."
					filters={
						<DataTableComboboxFilter
							field="deviceCategoryId"
							endpoint={api["device-category"].pagination}
							pagination={pagination}
							getLabel={(d) => d.name}
							getValue={(d) => d.id}
							placeholder="All Categories"
						/>
					}
				/>
			</div>

			<DeleteDeviceTemplateModal />
		</DeviceTemplateModalProvider>
	);
}
