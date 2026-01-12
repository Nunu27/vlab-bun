import { DataTable } from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import { usePagination } from '@frontend/hooks/use-pagination';
import api from '@frontend/lib/api';
import { privateRoute } from '@frontend/lib/middlewares';
import { createFileRoute } from '@tanstack/react-router';
import { ChangeUserPasswordModal } from '../../-module/components/modals/change-user-password-modal';
import { adminColumns } from './-module/columns';
import CreateAdminButton from './-module/components/buttons/create-admin-button';
import { CreateAdminModal } from './-module/components/modals/create-admin-modal';
import { DeleteAdminModal } from './-module/components/modals/delete-admin-modal';
import { EditAdminModal } from './-module/components/modals/edit-admin-modal';
import { AdminActionProvider } from './-module/stores/admin-action-store';
import type { AdminFields, AdminFilters, AdminItem } from './-module/types';

export const Route = createFileRoute('/_dashboard/user/admin/')({
  staticData: { breadcrumbs: [{ title: 'User' }, { title: 'Admin' }] },
  beforeLoad: privateRoute(['admin']),
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isFetching, params, handlers } = usePagination<
    AdminItem,
    AdminFields,
    AdminFilters
  >({
    queryKey: (params) => ['admin', 'pagination', params],
    queryFn: api.user.admin.pagination,
  });

  return (
    <AdminActionProvider>
      <div className="space-y-4">
        <PageHeading
          title="Admins"
          subtitle="Manage administrative users with elevated privileges."
          actions={<CreateAdminButton />}
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

        <CreateAdminModal />
        <EditAdminModal />
        <DeleteAdminModal />
        <ChangeUserPasswordModal />
      </div>
    </AdminActionProvider>
  );
}
