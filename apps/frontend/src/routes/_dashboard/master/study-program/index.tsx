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
import { studyProgramColumns } from './-module/columns';
import CreateStudyProgramButton from './-module/components/buttons/create-study-program-button';
import { CreateStudyProgramModal } from './-module/components/modals/create-study-program-modal';
import { DeleteStudyProgramModal } from './-module/components/modals/delete-study-program-modal';
import { EditStudyProgramModal } from './-module/components/modals/edit-study-program-modal';
import { StudyProgramActionProvider } from './-module/stores/study-program-action-store';
import type {
  StudyProgramFields,
  StudyProgramFilters,
  StudyProgramItem,
} from './-module/types';

export const Route = createFileRoute('/_dashboard/master/study-program/')({
  staticData: {
    breadcrumbs: [{ title: 'Master Data' }, { title: 'Study Program' }],
  },
  beforeLoad: privateRoute(['admin']),
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isFetching, params, handlers } = usePagination<
    StudyProgramItem,
    StudyProgramFields,
    StudyProgramFilters
  >({
    queryKey: (params) => ['study-program', 'pagination', params],
    queryFn: api['study-program'].pagination,
  });

  const departmentFilter = useMemo(() => {
    return params.filters?.find((f) => f.field === 'departmentId');
  }, [params.filters]);

  const handleDepartmentChange = (departmentId: string | undefined) => {
    const currentFilters = params.filters ?? [];
    const newFilters = currentFilters.filter(
      (f) => f.field !== 'departmentId',
    ) as StudyProgramFilters;

    if (departmentId) {
      newFilters.push({
        field: 'departmentId',
        op: 'eq',
        value: departmentId,
      });
    }

    handlers.onFilterChange(newFilters);
  };

  return (
    <StudyProgramActionProvider>
      <div className="space-y-4">
        <PageHeading
          title="Study Programs"
          subtitle="Manage study programs offered in the institution."
          actions={<CreateStudyProgramButton />}
        />
        <DataTable
          columns={studyProgramColumns}
          data={data?.items ?? []}
          pageInfo={data?.pageInfo}
          isLoading={isFetching}
          sortBy={params.sortBy}
          sortOrder={params.sortOrder}
          search={params.search}
          searchPlaceholder="Search by study program name..."
          filters={
            <DataTableFilterCombobox
              label="Department"
              width="w-[250px]"
              queryKey={(params) => ['department', 'pagination', params]}
              queryFn={async (params) =>
                await api.department.pagination.get({
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
              value={departmentFilter?.value}
              onChange={handleDepartmentChange}
              placeholder="All Departments"
              searchPlaceholder="Search departments..."
              emptyMessage="No departments found."
            />
          }
          {...handlers}
        />
      </div>

      <CreateStudyProgramModal />
      <EditStudyProgramModal />
      <DeleteStudyProgramModal />
    </StudyProgramActionProvider>
  );
}
