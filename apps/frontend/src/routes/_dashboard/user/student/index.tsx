import {
  DataTable,
  DataTableFilterCombobox,
} from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import api from '@frontend/lib/api';
import { privateRoute } from '@frontend/lib/middlewares';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import { ChangeUserPasswordModal } from '../../-module/components/modals/change-user-password-modal';
import { studentColumns } from './-module/columns';
import CreateStudentButton from './-module/components/buttons/create-student-button';
import { CreateStudentModal } from './-module/components/modals/create-student-modal';
import { DeleteStudentModal } from './-module/components/modals/delete-student-modal';
import { EditStudentModal } from './-module/components/modals/edit-student-modal';
import { StudentActionProvider } from './-module/stores/student-action-store';

export const Route = createFileRoute('/_dashboard/user/student/')({
  staticData: { breadcrumbs: [{ title: 'User' }, { title: 'Student' }] },
  beforeLoad: privateRoute(['admin']),
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isFetching, params, filterHelpers, handlers } =
    api.user.student.pagination.get.usePagination();

  const studyProgramFilter = useMemo(() => {
    return filterHelpers.getFilter('studyProgramId');
  }, [filterHelpers]);

  return (
    <StudentActionProvider>
      <div className="space-y-4">
        <PageHeading
          title="Students"
          subtitle="Manage student accounts and information."
          actions={<CreateStudentButton />}
        />
        <DataTable
          columns={studentColumns}
          data={data?.items ?? []}
          pageInfo={data?.pageInfo}
          isLoading={isFetching}
          sortBy={params.sortBy}
          sortOrder={params.sortOrder}
          search={params.search}
          searchPlaceholder="Search by NRP..."
          filters={
            <DataTableFilterCombobox
              label="Study Program"
              width="w-[250px]"
              endpoint={api['study-program'].pagination.get}
              params={{
                perPage: 10,
                sortBy: 'name',
                sortOrder: 'asc',
              }}
              getItemValue={(item) => item.id}
              getItemLabel={(item) => item.name}
              value={studyProgramFilter?.value}
              onChange={filterHelpers.setFilter.bind(
                null,
                'studyProgramId',
                'eq',
              )}
              placeholder="All Study Programs"
              searchPlaceholder="Search study programs..."
              emptyMessage="No study programs found."
            />
          }
          {...handlers}
        />

        <CreateStudentModal />
        <EditStudentModal />
        <ChangeUserPasswordModal />
        <DeleteStudentModal />
      </div>
    </StudentActionProvider>
  );
}
