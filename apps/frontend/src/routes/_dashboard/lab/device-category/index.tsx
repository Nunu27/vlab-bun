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
import { deviceCategoryColumns } from './-module/columns';
import { CreateDeviceCategoryModal } from './-module/components/modals/create-device-category-modal';

const breadcrumbs = [{ title: 'Lab Data' }, { title: 'Device Category' }];
const pagination = api['device-category'].pagination;

type Item = ExtractPaginationData<typeof pagination>;
type Fields = ExtractFields<typeof pagination>;
type Filters = ExtractFilters<typeof pagination>;

export const Route = createFileRoute('/_dashboard/lab/device-category/')({
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
    queryKey: (params) => ['device-category', 'pagination', params],
    queryFn: pagination,
  });

  return (
    <div className="space-y-4">
      <PageHeading
        title="Device Categories"
        subtitle="Manage devices categories."
        actions={<CreateDeviceCategoryModal />}
      />
      <DataTable
        columns={deviceCategoryColumns}
        data={data?.items ?? []}
        pageInfo={data?.pageInfo}
        isLoading={isFetching}
        sortBy={params.sortBy}
        sortOrder={params.sortOrder}
        search={params.search}
        searchPlaceholder="Search by device category name..."
        {...handlers}
      />
    </div>
  );
}
