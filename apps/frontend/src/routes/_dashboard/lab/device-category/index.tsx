import { DataTable } from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import api from '@frontend/lib/api';
import { privateRoute } from '@frontend/lib/middlewares';
import { createFileRoute } from '@tanstack/react-router';
import { deviceCategoryColumns } from './-module/columns';
import CreateDeviceCategoryButton from './-module/components/buttons/create-device-category-button';
import { CreateDeviceCategoryModal } from './-module/components/modals/create-device-category-modal';
import { DeleteDeviceCategoryModal } from './-module/components/modals/delete-device-category-modal';
import { EditDeviceCategoryModal } from './-module/components/modals/edit-device-category-modal';
import { DeviceCategoryActionProvider } from './-module/stores/device-category-action-store';

export const Route = createFileRoute('/_dashboard/lab/device-category/')({
  staticData: {
    breadcrumbs: [{ title: 'Lab Data' }, { title: 'Device Category' }],
  },
  beforeLoad: privateRoute(['admin']),
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isFetching, params, handlers } =
    api['device-category'].pagination.get.usePagination();

  return (
    <DeviceCategoryActionProvider>
      <div className="space-y-4">
        <PageHeading
          title="Device Categories"
          subtitle="Manage devices categories."
          actions={<CreateDeviceCategoryButton />}
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

        <CreateDeviceCategoryModal />
        <EditDeviceCategoryModal />
        <DeleteDeviceCategoryModal />
      </div>
    </DeviceCategoryActionProvider>
  );
}
