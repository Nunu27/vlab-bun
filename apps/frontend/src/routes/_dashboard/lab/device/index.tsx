import { DataTable } from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import { Button } from '@frontend/components/ui/button';
import api from '@frontend/lib/api';
import { privateRoute } from '@frontend/lib/middlewares';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { deviceColumns } from './-module/columns';
import { DeleteDeviceModal } from './-module/components/modals/delete-device-modal';
import { DeviceActionProvider } from './-module/stores/device-action-store';

export const Route = createFileRoute('/_dashboard/lab/device/')({
  staticData: { breadcrumbs: [{ title: 'Lab Data' }, { title: 'Device' }] },
  beforeLoad: privateRoute(['admin']),
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isFetching, params, handlers } =
    api.device.pagination.get.usePagination();

  return (
    <DeviceActionProvider>
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

        <DeleteDeviceModal />
      </div>
    </DeviceActionProvider>
  );
}
