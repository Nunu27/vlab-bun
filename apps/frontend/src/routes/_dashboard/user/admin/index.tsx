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
import { adminColumns } from './-module/columns';
import { CreateAdminModal } from './-module/components/modals/create-admin-modal';

const breadcrumbs = [{ title: 'User' }, { title: 'Admin' }];
const pagination = api.user.admin.pagination;

type Item = ExtractPaginationData<typeof pagination>;
type Fields = ExtractFields<typeof pagination>;
type Filters = ExtractFilters<typeof pagination>;

export const Route = createFileRoute('/_dashboard/user/admin/')({
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
    queryKey: (params) => ['admin', 'pagination', params],
    queryFn: pagination.post,
  });

  return (
    <div className="space-y-4">
      <PageHeading
        title="Admins"
        subtitle="Manage administrative users with elevated privileges."
        actions={<CreateAdminModal />}
      />
      <DataTable
        columns={adminColumns}
        data={data?.items ?? []}
        pageInfo={data?.pageInfo}
        isLoading={isFetching}
        sortBy={params.sortBy}
        sortOrder={params.sortOrder}
        search={params.search}
        searchPlaceholder="Search by name or email..."
        {...handlers}
      />
    </div>
  );
}
