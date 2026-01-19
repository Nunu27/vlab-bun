import { DataTable } from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import api from '@frontend/lib/api';
import { StudentLabActionProvider } from '../../stores/student-lab-action-store';
import { studentLabColumns } from '../../student-columns';
import StartLabSessionLogModal from '../modals/start-lab-session-log-modal';
import StopLabSessionLogModal from '../modals/stop-lab-session-log-modal';

export default function StudentLabPage() {
  const { data, isFetching, params, handlers } =
    api.lab.pagination.get.usePagination();

  return (
    <StudentLabActionProvider>
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

        <StartLabSessionLogModal />
        <StopLabSessionLogModal />
      </div>
    </StudentLabActionProvider>
  );
}
