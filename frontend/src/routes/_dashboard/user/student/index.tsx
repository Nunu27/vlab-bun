import { DataTable } from '@frontend/components/data-table';
import { CreateStudentModal } from '@frontend/routes/_dashboard/user/student/-module/components/modals/create-student-modal';
import { PageHeading } from '@frontend/components/page-heading';
import { usePagination } from '@frontend/hooks/use-pagination';
import api from '@frontend/lib/api';
import type {
  ExtractPaginationData,
  ExtractFields,
  ExtractFilters,
} from '@frontend/lib/api-types';
import { privateRoute } from '@frontend/lib/middlewares';
import { createFileRoute } from '@tanstack/react-router';
import { studentColumns } from './-module/columns';

const pagination = api.user.student.pagination;

type Item = ExtractPaginationData<typeof pagination>;
type Fields = ExtractFields<typeof pagination>;
type Filters = ExtractFilters<typeof pagination>;

export const Route = createFileRoute('/_dashboard/user/student/')({
  beforeLoad: ({ context }) => {
    privateRoute(['admin'])({ context });

    context.breadcrumbs = [{ title: 'User' }, { title: 'Student' }];
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isFetching, params, handlers } = usePagination<
    Item,
    Fields,
    Filters
  >({
    queryKey: (params) => ['student', 'pagination', params],
    queryFn: pagination.post,
  });

  return (
    <div className="space-y-4">
      <PageHeading
        title="Students"
        subtitle="Manage student accounts and information."
        actions={<CreateStudentModal />}
      />
      <DataTable
        columns={studentColumns}
        data={data?.items ?? []}
        pageInfo={data?.pageInfo}
        isLoading={isFetching}
        sortBy={params.sortBy}
        sortOrder={params.sortOrder}
        search={params.search}
        searchPlaceholder="Search by NRP..."
        {...handlers}
      />
    </div>
  );
}
