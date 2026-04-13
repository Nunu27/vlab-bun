import { DataTable } from "@web/components/data-table/data-table";
import { useApiPagination } from "@web/hooks/pagination/use-api-pagination";
import api from "@web/lib/api";
import { enrollmentColumns } from "../../columns";

function EnrollmentsTab({ labId }: { labId: string }) {
	const pagination = useApiPagination(api.lab({ labId }).enrollment.pagination);

	return <DataTable pagination={pagination} columns={enrollmentColumns} />;
}

export default EnrollmentsTab;
