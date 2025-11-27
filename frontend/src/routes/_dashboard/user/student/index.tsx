import {
  DataTable,
  DataTableFilterCombobox,
} from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import { usePagination } from '@frontend/hooks/use-pagination';
import api from '@frontend/lib/api';
import type {
  ExtractFields,
  ExtractFilters,
  ExtractPaginationData,
} from '@frontend/lib/api-types';
import { privateRoute } from '@frontend/lib/middlewares';
import { getTitleFromBreadcrumbs } from '@frontend/lib/utils';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import { studentColumns } from './-module/columns';
import { CreateStudentModal } from './-module/components/modals/create-student-modal';

const breadcrumbs = [{ title: 'User' }, { title: 'Student' }];
const pagination = api.user.student.pagination;

type Item = ExtractPaginationData<typeof pagination>;
type Fields = ExtractFields<typeof pagination>;
type Filters = ExtractFilters<typeof pagination>;

export const Route = createFileRoute('/_dashboard/user/student/')({
  head: () => ({
    meta: [{ title: getTitleFromBreadcrumbs(breadcrumbs) }],
  }),
  beforeLoad: ({ context }) => {
    privateRoute(['admin'])({ context });

    context.breadcrumbs = breadcrumbs;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isFetching, params, handlers } = usePagination<
    Item,
    Fields,
    Filters
  >({
    queryKey: (params) => ['student', 'pagination', params],
    queryFn: pagination.post,
  });

  const studyProgramFilter = useMemo(() => {
    return params.filters?.find((f) => f.field === 'studyProgramId');
  }, [params.filters]);

  const handleStudyProgramChange = (studyProgramId: string | undefined) => {
    const currentFilters = params.filters ?? [];
    const newFilters = currentFilters.filter(
      (f) => f.field !== 'studyProgramId',
    ) as Filters;

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
    <div className="space-y-4">
      <PageHeading
        title="Students"
        subtitle="Manage student accounts and information."
        actions={<CreateStudentModal />}
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
            queryFn={async (params) => {
              const response = await api['study-program'].pagination.post({
                page: params.page,
                perPage: 10,
                sortBy: 'name',
                sortOrder: 'asc',
                search: params.search,
              });

              if (response.error) {
                throw new Error('Failed to fetch study programs');
              }

              return response.data!.data;
            }}
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
    </div>
  );
}
