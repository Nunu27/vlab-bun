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
import { lecturerColumns } from './-module/columns';
import { CreateLecturerModal } from './-module/components/modals/create-lecturer-modal';
const breadcrumbs = [{ title: 'User' }, { title: 'Lecturer' }];
const pagination = api.user.lecturer.pagination;

type Item = ExtractPaginationData<typeof pagination>;
type Fields = ExtractFields<typeof pagination>;
type Filters = ExtractFilters<typeof pagination>;

export const Route = createFileRoute('/_dashboard/user/lecturer/')({
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
    queryKey: (params) => ['lecturer', 'pagination', params],
    queryFn: pagination.post,
  });

  return (
    <div className="space-y-4">
      <PageHeading
        title="Lecturers"
        subtitle="Manage lecturer accounts and information."
        actions={<CreateLecturerModal />}
      />
      <DataTable
        columns={lecturerColumns}
        data={data?.items ?? []}
        pageInfo={data?.pageInfo}
        isLoading={isFetching}
        sortBy={params.sortBy}
        sortOrder={params.sortOrder}
        search={params.search}
        searchPlaceholder="Search by NIP..."
        {...handlers}
      />
    </div>
  );
}
