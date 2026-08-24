import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@web/components/data-table/data-table";
import LoadingPage from "@web/components/pages/loading-page";
import { Button } from "@web/components/ui/button";
import type { UseApiPaginationReturn } from "@web/hooks/pagination/use-api-pagination";
import { useWSEvent } from "@web/hooks/ws";
import api from "@web/lib/api";
import type { PaginationQuery, SortOrder } from "@web/types";
import { DownloadIcon } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import type { LabEnrollmentItem } from "../../../../-module/types";
import { enrollmentColumns } from "../../columns";

type EnrollmentFilters = NonNullable<PaginationQuery["filters"]>;

// The enrollment list has no server-side pagination endpoint (it's fetched
// whole and kept live over WebSocket), so this adapts that plain array to
// the same shape `DataTable` expects from `useApiPagination` — field names
// (perPage/setPerPage/setSort, not limit/setLimit/setSortBy+setSortOrder)
// have to match exactly, since `DataTable`/`DataTablePagination`/
// `DataTableColumnHeader` all read straight from this object.
function useClientPagination(
	data: LabEnrollmentItem[],
	isLoading: boolean,
	isFetching: boolean,
	refresh: () => void,
): UseApiPaginationReturn<LabEnrollmentItem> {
	const [page, setPageState] = useState(1);
	const [perPage, setPerPageState] = useState(10);
	const [search, setSearchState] = useState("");
	const [sortBy, setSortByState] = useState<string | undefined>(undefined);
	const [sortOrder, setSortOrderState] = useState<SortOrder>("asc");
	const [filters, setFiltersState] = useState<EnrollmentFilters | undefined>(
		undefined,
	);

	const filteredData = useMemo(() => {
		if (!search) return data;
		const lowerSearch = search.toLowerCase();
		return data.filter(
			(item) =>
				item.name.toLowerCase().includes(lowerSearch) ||
				item.nrp.toLowerCase().includes(lowerSearch),
		);
	}, [data, search]);

	const paginatedData = useMemo(() => {
		const start = (page - 1) * perPage;
		return filteredData.slice(start, start + perPage);
	}, [filteredData, page, perPage]);

	const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage));

	const mockPromise = () => Promise.resolve(new URLSearchParams());

	return {
		data: {
			items: paginatedData,
			pageInfo: {
				page,
				perPage,
				total: filteredData.length,
				totalPages,
			},
		},
		isLoading,
		isFetching,
		error: null,
		refresh,
		page,
		setPage: (p: number) => {
			setPageState(p);
			return mockPromise();
		},
		perPage,
		setPerPage: (pp: number) => {
			setPerPageState(pp);
			setPageState(1);
			return mockPromise();
		},
		search,
		setSearch: (s: string) => {
			setSearchState(s);
			setPageState(1);
			return mockPromise();
		},
		sortBy,
		sortOrder,
		setSort: (by: string | undefined, order: SortOrder) => {
			setSortByState(by);
			setSortOrderState(order);
			setPageState(1);
			return mockPromise();
		},
		filters,
		setFilters: (f: EnrollmentFilters | null) => {
			setFiltersState(f ?? undefined);
			setPageState(1);
		},
		params: { page, perPage, search, sortBy, sortOrder },
	};
}

function EnrollmentsTabContent({ labId }: { labId: string }) {
	const queryClient = useQueryClient();
	const { data, refetch, isLoading, isFetching } = api
		.lab({ labId })
		.enrollment.get.useSuspenseQuery();

	useWSEvent("lab:[labId]:enrollment:new", {
		params: { labId },
		handler: (enrollment) => {
			api.lab({ labId }).enrollment.get.setQueryData(queryClient, (oldData) => {
				if (!oldData) return oldData;
				const exists = oldData.some((e) => e.id === enrollment.id);
				if (exists) return oldData;
				return [enrollment, ...oldData];
			});
		},
	});

	useWSEvent("lab:[labId]:enrollment:update", {
		params: { labId },
		handler: (updateData) => {
			api.lab({ labId }).enrollment.get.setQueryData(queryClient, (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((e) => {
					if (e.id === updateData.id) {
						let newScore = e.score;
						if (updateData.score !== undefined) {
							if (
								e.score == null ||
								Number(updateData.score) > Number(e.score)
							) {
								newScore = updateData.score;
							}
						}
						return {
							...e,
							status: updateData.status,
							score: newScore,
							lastUpdated: updateData.lastUpdated || e.lastUpdated,
						};
					}
					return e;
				});
			});
		},
	});

	useWSEvent("lab:[labId]:enrollment:remove", {
		params: { labId },
		handler: ({ studentId }) => {
			api.lab({ labId }).enrollment.get.setQueryData(queryClient, (oldData) => {
				if (!oldData) return oldData;
				return oldData.filter((e) => e.id !== studentId);
			});
		},
	});

	const items = useMemo(
		() =>
			data.map((item, index) => ({
				...item,
				index: index + 1,
			})),
		[data],
	);

	const pagination = useClientPagination(items, isLoading, isFetching, refetch);

	const handleExportCsv = () => {
		const headers = ["NRP", "Name", "Status", "Score", "Last Updated"];
		const rows = items.map((item) => {
			const score = item.score ?? "-";
			const lastUpdated =
				item.status !== "Not Started"
					? new Date(item.lastUpdated).toLocaleString()
					: "-";
			return [item.nrp, item.name, item.status, score, lastUpdated];
		});

		const csvContent = [
			headers.join(","),
			...rows.map((row) =>
				row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
			),
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute(
			"download",
			`enrollments-${labId}-${new Date().toISOString()}.csv`,
		);
		document.body.appendChild(link);
		link.click();
		link.remove();
	};

	return (
		<DataTable
			pagination={pagination}
			columns={enrollmentColumns}
			searchPlaceholder="Search by name or NRP..."
			filters={
				<Button variant="outline" onClick={handleExportCsv}>
					<DownloadIcon />
					Export CSV
				</Button>
			}
		/>
	);
}

function EnrollmentsTab({ labId }: { labId: string }) {
	return (
		<Suspense fallback={<LoadingPage />}>
			<EnrollmentsTabContent labId={labId} />
		</Suspense>
	);
}

export default EnrollmentsTab;
