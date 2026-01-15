import { DataTable } from '@frontend/components/data-table';
import { PageHeading } from '@frontend/components/page-heading';
import { Button } from '@frontend/components/ui/button';
import api from '@frontend/lib/api';
import { Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { studentLabColumns } from '../../lecturer-columns';

export default function LecturerLabPage() {
  const { data, isFetching, params, handlers } =
    api.lab.pagination.get.usePagination();

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
