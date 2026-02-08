import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@web/components/data-table";
import { PageHeading } from "@web/components/sections/page-heading";
import { useApiPagination } from "@web/hooks/pagination/use-api-pagination";
import api from "@web/lib/api";
import { privateRoute } from "@web/lib/middlewares";
import { deviceCategoryColumns } from "./-module/columns";
import CreateDeviceCategoryButton from "./-module/components/buttons/create-device-category-button";
import { CreateDeviceCategoryModal } from "./-module/components/modals/create-device-category-modal";
import { DeleteDeviceCategoryModal } from "./-module/components/modals/delete-device-category-modal";
import { EditDeviceCategoryModal } from "./-module/components/modals/edit-device-category-modal";
import { DeviceCategoryModalProvider } from "./-module/stores/device-category-modal-store";

export const Route = createFileRoute(
	"/_dashboard/(admin)/lab-data/device-category/",
)({
	staticData: {
		breadcrumbs: [{ title: "Lab Data" }, { title: "Device Category" }],
	},
	beforeLoad: privateRoute(["admin"]),
	component: RouteComponent,
});

function RouteComponent() {
	const pagination = useApiPagination(api["device-category"].pagination);

	return (
		<DeviceCategoryModalProvider>
			<div className="space-y-4">
				<PageHeading
					title="Device Categories"
					subtitle="Manage types of device templates."
					actions={<CreateDeviceCategoryButton />}
				/>
				<DataTable
					pagination={pagination}
					columns={deviceCategoryColumns}
					searchPlaceholder="Search by category name..."
				/>
			</div>

			<CreateDeviceCategoryModal />
			<EditDeviceCategoryModal />
			<DeleteDeviceCategoryModal />
		</DeviceCategoryModalProvider>
	);
}
