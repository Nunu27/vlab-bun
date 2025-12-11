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
import { getTitleFromBreadcrumbs } from '@frontend/lib/utils';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { deviceColumns } from './-module/columns';

const breadcrumbs = [{ title: 'Lab Data' }, { title: 'Device' }];
const pagination = api.device.pagination;

type Item = ExtractPaginationData<typeof pagination>;
type Fields = ExtractFields<typeof pagination>;
type Filters = ExtractFilters<typeof pagination>;

export const Route = createFileRoute('/_dashboard/lab/device/')({
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
    queryKey: (params) => ['device', 'pagination', params],
    queryFn: pagination.post,
    staleTime: 0,
  });

  return (
    <div className="space-y-4">
      <PageHeading
        title="Devices"
        subtitle="Manage devices that can be used in the lab."
        actions={
          <Button size="lg" asChild>
            <Link to="/lab/device/create">
              <PlusIcon /> Add Device
            </Link>
          </Button>
        }
      />
      <DataTable
        columns={deviceColumns}
        data={data?.items ?? []}
        pageInfo={data?.pageInfo}
        isLoading={isFetching}
        sortBy={params.sortBy}
        sortOrder={params.sortOrder}
        search={params.search}
        searchPlaceholder="Search by device name..."
        {...handlers}
      />
    </div>
  );
}
