import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "@web/components/data-table";
import { DataTableComboboxFilter } from "@web/components/data-table/data-table-combobox-filter";
import { PageHeading } from "@web/components/sections/page-heading";
import { useApiPagination } from "@web/hooks/pagination/use-api-pagination";
import api from "@web/lib/api";
import { studyProgramColumns } from "./-module/columns";
import CreateStudyProgramButton from "./-module/components/buttons/create-study-program-button";
import { CreateStudyProgramModal } from "./-module/components/modals/create-study-program-modal";
import { DeleteStudyProgramModal } from "./-module/components/modals/delete-study-program-modal";
import { EditStudyProgramModal } from "./-module/components/modals/edit-study-program-modal";
import { StudyProgramModalProvider } from "./-module/stores/study-program-modal-store";

export const Route = createFileRoute(
	"/_dashboard/_admin/master/study-program/",
)({
	staticData: {
		breadcrumbs: [{ title: "Master Data" }, { title: "Study Program" }],
	},
	component: RouteComponent,
});

function RouteComponent() {
	const pagination = useApiPagination(api["study-program"].pagination);

	return (
		<StudyProgramModalProvider>
			<div className="space-y-4">
				<PageHeading
					title="Study Programs"
					subtitle="Manage academic study programs constraint to departments."
					actions={<CreateStudyProgramButton />}
				/>
				<DataTable
					pagination={pagination}
					columns={studyProgramColumns}
					searchPlaceholder="Search by study program name..."
					filters={
						<DataTableComboboxFilter
							field="departmentId"
							endpoint={api.department.pagination}
							pagination={pagination}
							getLabel={(d) => d.name}
							getValue={(d) => d.id}
							placeholder="All Departments"
						/>
					}
				/>
			</div>

			<CreateStudyProgramModal />
			<EditStudyProgramModal />
			<DeleteStudyProgramModal />
		</StudyProgramModalProvider>
	);
}
