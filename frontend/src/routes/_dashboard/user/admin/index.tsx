import { DataTable } from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import { Button } from '@frontend/components/ui/button';
import { usePagination } from '@frontend/hooks/use-pagination';
import api from '@frontend/lib/api';
import type {
  ExtractFields,
  ExtractFilters,
  ExtractPaginationData,
} from '@frontend/lib/api-types';
import { privateRoute } from '@frontend/lib/middlewares';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { adminColumns } from './-module/columns';

const pagination = api.user.admin.pagination;

type Item = ExtractPaginationData<typeof pagination>;
type Fields = ExtractFields<typeof pagination>;
type Filters = ExtractFilters<typeof pagination>;

export const Route = createFileRoute('/_dashboard/user/admin/')({
  beforeLoad: ({ context }) => {
    privateRoute(['admin'])({ context });

    context.breadcrumbs = [{ title: 'User' }, { title: 'Admin' }];
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isFetching, params, handlers } = usePagination<
    Item,
    Fields,
    Filters
  >({
    queryKey: (params) => ['admin', 'pagination', params] as const,
    queryFn: pagination.post,
  });

  return (
    <div className="space-y-4">
      <PageHeading
        title="Admins"
        subtitle="Manage administrative users with elevated privileges."
        actions={
          <Button size="lg" asChild>
            <Link to="/">
              <PlusIcon /> Create Admin
            </Link>
          </Button>
        }
      />
      <DataTable
        columns={adminColumns}
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
        searchPlaceholder="Search by name or email..."
        {...handlers}
      />
    </div>
  );
}
