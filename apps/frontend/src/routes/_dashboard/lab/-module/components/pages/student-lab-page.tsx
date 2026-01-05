import { DataTable } from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import { usePagination } from '@frontend/hooks/use-pagination';
import { studentLabColumns } from '../../student-columns';
import api from '@frontend/lib/api';
import type {
  ExtractFields,
  ExtractFilters,
  ExtractPaginationData,
} from '@frontend/types/api';

const pagination = api.lab.pagination;
type Item = ExtractPaginationData<typeof pagination>;
type Fields = ExtractFields<typeof pagination>;
type Filters = ExtractFilters<typeof pagination>;

export default function StudentLabPage() {
  const { data, isFetching, params, handlers } = usePagination<
    Item,
    Fields,
    Filters
  >({
    queryKey: (params) => ['lab', 'pagination', params],
    queryFn: pagination,
  });

  return (
    <div className="space-y-4">
      <PageHeading title="Labs" subtitle="Browse available labs." />
      <DataTable
        columns={studentLabColumns}
        data={data?.items ?? []}
        pageInfo={data?.pageInfo}
        isLoading={isFetching}
        sortBy={params.sortBy}
        sortOrder={params.sortOrder}
        search={params.search}
        searchPlaceholder="Search by lab name..."
        {...handlers}
      />
    </div>
  );
}
