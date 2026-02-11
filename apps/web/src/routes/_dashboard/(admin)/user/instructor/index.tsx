import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@web/components/data-table";
import { PageHeading } from "@web/components/sections/page-heading";
import { useApiPagination } from "@web/hooks/pagination/use-api-pagination";
import api from "@web/lib/api";
import { privateRoute } from "@web/lib/middlewares";
import { ChangePasswordModal } from "../-module/components/modals/change-password-modal";
import { UserPasswordModalProvider } from "../-module/stores/user-password-modal-store";
import { instructorColumns } from "./-module/columns";
import { CreateInstructorButton } from "./-module/components/buttons/create-instructor-button";
import { CreateInstructorModal } from "./-module/components/modals/create-instructor-modal";
import { DeleteInstructorModal } from "./-module/components/modals/delete-instructor-modal";
import { EditInstructorModal } from "./-module/components/modals/edit-instructor-modal";
import { InstructorModalProvider } from "./-module/stores/instructor-modal-store";

export const Route = createFileRoute("/_dashboard/(admin)/user/instructor/")({
	staticData: {
		breadcrumbs: [{ title: "User" }, { title: "Instructor" }],
	},
	beforeLoad: privateRoute(["admin"]),
	component: RouteComponent,
});

function RouteComponent() {
	const pagination = useApiPagination(api.user.instructor.pagination);

	return (
		<InstructorModalProvider>
			<UserPasswordModalProvider>
				<div className="flex flex-col gap-4">
					<PageHeading
						title="Instructor Directory"
						subtitle="Manage instructor accounts and profiles."
						actions={<CreateInstructorButton />}
					/>
					<DataTable
						pagination={pagination}
						columns={instructorColumns}
						searchPlaceholder="Search by instructor name..."
					/>
				</div>

				<CreateInstructorModal />
				<EditInstructorModal />
				<DeleteInstructorModal />
				<ChangePasswordModal />
			</UserPasswordModalProvider>
		</InstructorModalProvider>
	);
}
