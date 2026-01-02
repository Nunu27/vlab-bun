import { DataTable } from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import { usePagination } from '@frontend/hooks/use-pagination';
import api from '@frontend/lib/api';
import { privateRoute } from '@frontend/lib/middlewares';
import type {
  ExtractFields,
  ExtractFilters,
  ExtractPaginationData,
} from '@frontend/types/api';
import { createFileRoute } from '@tanstack/react-router';
import { departmentColumns } from './-module/columns';
import { CreateDepartmentModal } from './-module/components/modals/create-department-modal';

const breadcrumbs = [{ title: 'Master Data' }, { title: 'Department' }];
const pagination = api.department.pagination;

type Item = ExtractPaginationData<typeof pagination>;
type Fields = ExtractFields<typeof pagination>;
type Filters = ExtractFilters<typeof pagination>;

export const Route = createFileRoute('/_dashboard/master/department/')({
  staticData: { breadcrumbs },
  beforeLoad: privateRoute(['admin']),
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isFetching, params, handlers } = usePagination<
    Item,
    Fields,
    Filters
  >({
    queryKey: (params) => ['department', 'pagination', params],
    queryFn: pagination.post,
  });

  return (
    <div className="space-y-4">
      <PageHeading
        title="Departments"
        subtitle="Manage academic departments within the institution."
        actions={<CreateDepartmentModal />}
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
  );
}
