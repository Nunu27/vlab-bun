import { DataTable } from '@frontend/components/data-table';
import { Link } from '@tanstack/react-router';
import { PageHeading } from '@frontend/components/page-heading';
import { Button } from '@frontend/components/ui/button';
import { usePagination } from '@frontend/hooks/use-pagination';
import { PlusIcon } from 'lucide-react';
import { studentLabColumns } from '../../lecturer-columns';
import api from '@frontend/lib/api';
import type {
  ExtractFields,
  ExtractFilters,
  ExtractPaginationData,
} from '@frontend/lib/api-types';

const pagination = api.lab.pagination;
type Item = ExtractPaginationData<typeof pagination>;
type Fields = ExtractFields<typeof pagination>;
type Filters = ExtractFilters<typeof pagination>;

export default function LecturerLabPage() {
  const { data, isFetching, params, handlers } = usePagination<
    Item,
    Fields,
    Filters
  >({
    queryKey: (params) => ['lab', 'pagination', params],
    queryFn: pagination.post,
  });

  return (
    <div className="space-y-4">
      <PageHeading
        title="Labs"
        subtitle="Manage your labs."
        actions={
          <Button asChild>
            <Link to="/lab/create">
              <PlusIcon className="mr-2 size-4" />
              Create Lab
            </Link>
          </Button>
        }
      />
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
