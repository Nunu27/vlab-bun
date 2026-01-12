import {
  DataTable,
  DataTableFilterCombobox,
} from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import { usePagination } from '@frontend/hooks/use-pagination';
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
import type {
  StudentFields,
  StudentFilters,
  StudentItem,
} from './-module/types';

export const Route = createFileRoute('/_dashboard/user/student/')({
  staticData: { breadcrumbs: [{ title: 'User' }, { title: 'Student' }] },
  beforeLoad: privateRoute(['admin']),
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isFetching, params, handlers } = usePagination<
    StudentItem,
    StudentFields,
    StudentFilters
  >({
    queryKey: (params) => ['student', 'pagination', params],
    queryFn: api.user.student.pagination,
  });

  const studyProgramFilter = useMemo(() => {
    return params.filters?.find((f) => f.field === 'studyProgramId');
  }, [params.filters]);

  const handleStudyProgramChange = (studyProgramId: string | undefined) => {
    const currentFilters = params.filters ?? [];
    const newFilters = currentFilters.filter(
      (f) => f.field !== 'studyProgramId',
    ) as StudentFilters;

    if (studyProgramId) {
      newFilters.push({
        field: 'studyProgramId',
        op: 'eq',
        value: studyProgramId,
      });
    }

    handlers.onFilterChange(newFilters);
  };

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
              queryKey={(params) => ['study-program', 'pagination', params]}
              queryFn={async (params) =>
                await api['study-program'].pagination.get({
                  query: {
                    page: params.page,
                    perPage: 10,
                    sortBy: 'name',
                    sortOrder: 'asc',
                    search: params.search,
                  },
                })
              }
              getItemValue={(item) => item.id}
              getItemLabel={(item) => item.name}
              value={studyProgramFilter?.value}
              onChange={handleStudyProgramChange}
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
