import { DataTable } from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import { usePagination } from '@frontend/hooks/use-pagination';
import api from '@frontend/lib/api';
import { privateRoute } from '@frontend/lib/middlewares';
import { createFileRoute } from '@tanstack/react-router';
import { ChangeUserPasswordModal } from '../../-module/components/modals/change-user-password-modal';
import { lecturerColumns } from './-module/columns';
import CreateLecturerButton from './-module/components/buttons/create-lecturer-button';
import { CreateLecturerModal } from './-module/components/modals/create-lecturer-modal';
import { DeleteLecturerModal } from './-module/components/modals/delete-lecturer-modal';
import { EditLecturerModal } from './-module/components/modals/edit-lecturer-modal';
import type {
  LecturerFields,
  LecturerFilters,
  LecturerItem,
} from './-module/types';
import { LecturerActionProvider } from './-module/stores/lecturer-action-store';

export const Route = createFileRoute('/_dashboard/user/lecturer/')({
  staticData: { breadcrumbs: [{ title: 'User' }, { title: 'Lecturer' }] },
  beforeLoad: privateRoute(['admin']),
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isFetching, params, handlers } = usePagination<
    LecturerItem,
    LecturerFields,
    LecturerFilters
  >({
    queryKey: (params) => ['lecturer', 'pagination', params],
    queryFn: api.user.lecturer.pagination,
  });

  return (
    <LecturerActionProvider>
      <div className="space-y-4">
        <PageHeading
          title="Lecturers"
          subtitle="Manage lecturer accounts and information."
          actions={<CreateLecturerButton />}
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

        <CreateLecturerModal />
        <EditLecturerModal />
        <DeleteLecturerModal />
        <ChangeUserPasswordModal />
      </div>
    </LecturerActionProvider>
  );
}
