import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@web/components/data-table";
import { PageHeading } from "@web/components/sections/page-heading";
import { useApiPagination } from "@web/hooks/pagination/use-api-pagination";
import api from "@web/lib/api";
import { privateRoute } from "@web/lib/middlewares";
import { adminColumns } from "./-module/columns";
import { CreateAdminButton } from "./-module/components/buttons/create-admin-button";
import { CreateAdminModal } from "./-module/components/modals/create-admin-modal";
import { DeleteAdminModal } from "./-module/components/modals/delete-admin-modal";
import { EditAdminModal } from "./-module/components/modals/edit-admin-modal";
import { AdminModalProvider } from "./-module/stores/admin-modal-store";

export const Route = createFileRoute("/_dashboard/(admin)/user/admin/")({
	staticData: {
		breadcrumbs: [{ title: "User" }, { title: "Admin" }],
	},
	beforeLoad: privateRoute(["admin"]),
	component: RouteComponent,
});

function RouteComponent() {
	const pagination = useApiPagination(api.user.admin.pagination);

	return (
		<AdminModalProvider>
			<div className="flex flex-col gap-4">
				<PageHeading
					title="Admin Directory"
					subtitle="Manage system administrators and privileges."
					actions={<CreateAdminButton />}
				/>
				<DataTable
					pagination={pagination}
					columns={adminColumns}
					searchPlaceholder="Search by admin name..."
				/>
			</div>

			<CreateAdminModal />
			<EditAdminModal />
			<DeleteAdminModal />
		</AdminModalProvider>
	);
}
