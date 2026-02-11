import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@web/components/data-table";
import { PageHeading } from "@web/components/sections/page-heading";
import { useApiPagination } from "@web/hooks/pagination/use-api-pagination";
import api from "@web/lib/api";
import { privateRoute } from "@web/lib/middlewares";
import { ChangePasswordModal } from "../-module/components/modals/change-password-modal";
import { UserPasswordModalProvider } from "../-module/stores/user-password-modal-store";
import { studentColumns } from "./-module/columns";
import CreateStudentButton from "./-module/components/buttons/create-student-button";
import { CreateStudentModal } from "./-module/components/modals/create-student-modal";
import { DeleteStudentModal } from "./-module/components/modals/delete-student-modal";
import { EditStudentModal } from "./-module/components/modals/edit-student-modal";
import { StudentModalProvider } from "./-module/stores/student-modal-store";

export const Route = createFileRoute("/_dashboard/(admin)/user/student/")({
	staticData: {
		breadcrumbs: [{ title: "User" }, { title: "Student" }],
	},
	beforeLoad: privateRoute(["admin"]),
	component: RouteComponent,
});

function RouteComponent() {
	const pagination = useApiPagination(api.user.student.pagination);

	return (
		<StudentModalProvider>
			<UserPasswordModalProvider>
				<div className="flex flex-col gap-4">
					<PageHeading
						title="Student Directory"
						subtitle="Manage student accounts and profiles."
						actions={<CreateStudentButton />}
					/>
					<DataTable
						pagination={pagination}
						columns={studentColumns}
						searchPlaceholder="Search by student name..."
					/>
				</div>

				<CreateStudentModal />
				<EditStudentModal />
				<DeleteStudentModal />
				<ChangePasswordModal />
			</UserPasswordModalProvider>
		</StudentModalProvider>
	);
}
