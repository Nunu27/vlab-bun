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
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import { studyProgramColumns } from './-module/columns';
import { CreateStudyProgramModal } from './-module/components/modals/create-study-program-modal';

const pagination = api['study-program'].pagination;

type Item = ExtractPaginationData<typeof pagination>;
type Fields = ExtractFields<typeof pagination>;
type Filters = ExtractFilters<typeof pagination>;

export const Route = createFileRoute('/_dashboard/master/study-program/')({
  beforeLoad: ({ context }) => {
    privateRoute(['admin'])({ context });

    context.breadcrumbs = [
      { title: 'Master Data' },
      { title: 'Study Program' },
    ];
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isFetching, params, handlers } = usePagination<
    Item,
    Fields,
    Filters
  >({
    queryKey: (params) => ['study-program', 'pagination', params],
    queryFn: pagination.post,
  });

  const departmentFilter = useMemo(() => {
    return params.filters?.find((f) => f.field === 'departmentId');
  }, [params.filters]);

  const handleDepartmentChange = (departmentId: string | undefined) => {
    console.log('Selected departmentId:', departmentId);
    const currentFilters = params.filters ?? ([] as Filters);
    const newFilters = currentFilters.filter(
      (f) => f.field !== 'departmentId',
    ) as Filters;

    if (departmentId) {
      newFilters.push({
        field: 'departmentId' as const,
        op: 'eq' as const,
        value: departmentId,
      });
    }

    handlers.onFilterChange(newFilters);
  };

  return (
    <div className="space-y-4">
      <PageHeading
        title="Study Programs"
        subtitle="Manage study programs offered in the institution."
        actions={<CreateStudyProgramModal />}
      />
      <DataTable
        columns={studyProgramColumns}
        data={data?.items ?? []}
        pageInfo={
          data?.pageInfo ?? {
            page: 1,
            perPage: 10,
            total: 0,
            totalPages: 0,
          }
        }
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
            queryFn={async (params) => {
              const response = await api.department.pagination.post({
                page: params.page,
                perPage: 10,
                sortBy: 'name',
                sortOrder: 'asc',
                search: params.search,
              });

              if (response.error) {
                throw new Error('Failed to fetch departments');
              }

              return response.data!.data;
            }}
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
  );
}
