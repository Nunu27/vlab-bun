import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@web/components/data-table";
import { PageHeading } from "@web/components/sections/page-heading";
import { useApiPagination } from "@web/hooks/pagination/use-api-pagination";
import api from "@web/lib/api";
import { departmentColumns } from "./-module/columns";
import CreateDepartmentButton from "./-module/components/buttons/create-department-button";
import { CreateDepartmentModal } from "./-module/components/modals/create-department-modal";
import { DeleteDepartmentModal } from "./-module/components/modals/delete-department-modal";
import { EditDepartmentModal } from "./-module/components/modals/edit-department-modal";
import { DepartmentModalProvider } from "./-module/stores/department-modal-store";

export const Route = createFileRoute("/_dashboard/_admin/master/department/")({
	staticData: {
		breadcrumbs: [{ title: "Master Data" }, { title: "Department" }],
	},
	component: RouteComponent,
});

function RouteComponent() {
	const pagination = useApiPagination(api.department.pagination, { query: {} });

	return (
		<DepartmentModalProvider>
			<div className="space-y-4">
				<PageHeading
					title="Departments"
					subtitle="Manage academic departments within the institution."
					actions={<CreateDepartmentButton />}
				/>
				<DataTable
					pagination={pagination}
					columns={departmentColumns}
					searchPlaceholder="Search by department name..."
				/>
			</div>

			<CreateDepartmentModal />
			<EditDepartmentModal />
			<DeleteDepartmentModal />
		</DepartmentModalProvider>
	);
}
