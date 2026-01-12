import { DataTable } from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import { usePagination } from '@frontend/hooks/use-pagination';
import api from '@frontend/lib/api';
import { privateRoute } from '@frontend/lib/middlewares';
import { createFileRoute } from '@tanstack/react-router';
import { departmentColumns } from './-module/columns';
import CreateDepartmentButton from './-module/components/buttons/create-department-button';
import { CreateDepartmentModal } from './-module/components/modals/create-department-modal';
import { DeleteDepartmentModal } from './-module/components/modals/delete-department-modal';
import { EditDepartmentModal } from './-module/components/modals/edit-department-modal';
import { DepartmentActionProvider } from './-module/stores/department-action-store';
import type {
  DepartmentFields,
  DepartmentFilters,
  DepartmentItem,
} from './-module/types';

export const Route = createFileRoute('/_dashboard/master/department/')({
  staticData: {
    breadcrumbs: [{ title: 'Master Data' }, { title: 'Department' }],
  },
  beforeLoad: privateRoute(['admin']),
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isFetching, params, handlers } = usePagination<
    DepartmentItem,
    DepartmentFields,
    DepartmentFilters
  >({
    queryKey: (params) => ['department', 'pagination', params],
    queryFn: api.department.pagination,
  });

  return (
    <DepartmentActionProvider>
      <div className="space-y-4">
        <PageHeading
          title="Departments"
          subtitle="Manage academic departments within the institution."
          actions={<CreateDepartmentButton />}
        />
        <DataTable
          columns={departmentColumns}
          data={data?.items ?? []}
          pageInfo={data?.pageInfo}
          isLoading={isFetching}
          sortBy={params.sortBy}
          sortOrder={params.sortOrder}
          search={params.search}
          searchPlaceholder="Search by department name..."
          {...handlers}
        />
      </div>

      <CreateDepartmentModal />
      <EditDepartmentModal />
      <DeleteDepartmentModal />
    </DepartmentActionProvider>
  );
}
