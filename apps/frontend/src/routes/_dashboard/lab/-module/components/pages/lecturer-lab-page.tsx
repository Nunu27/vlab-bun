import { DataTable } from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import api from '@frontend/lib/api';
import { studentLabColumns } from '../../lecturer-columns';
import { LecturerLabActionProvider } from '../../stores/lecturer-lab-action-store';
import CreateLabButton from '../buttons/create-lab-button';
import DeleteLabModal from '../modals/delete-lab-modal';

export default function LecturerLabPage() {
  const { data, isFetching, params, handlers } =
    api.lab.pagination.get.usePagination();

  return (
    <LecturerLabActionProvider>
      <div className="space-y-4">
        <PageHeading
          title="Labs"
          subtitle="Manage your labs."
          actions={<CreateLabButton />}
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

        <DeleteLabModal />
      </div>
    </LecturerLabActionProvider>
  );
}
