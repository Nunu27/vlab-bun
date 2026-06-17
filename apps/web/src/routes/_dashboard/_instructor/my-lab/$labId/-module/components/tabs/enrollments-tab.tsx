import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@web/components/data-table/data-table";
import type { UseApiPaginationReturn } from "@web/hooks/pagination/use-api-pagination";
import { useWSEvent } from "@web/hooks/ws";
import api from "@web/lib/api";
import { useMemo, useState } from "react";
import type { LabEnrollmentItem } from "../../../../-module/types";
import { enrollmentColumns } from "../../columns";

function useClientPagination(
	data: LabEnrollmentItem[],
	isLoading: boolean,
	isFetching: boolean,
	refresh: () => void,
): UseApiPaginationReturn<LabEnrollmentItem> {
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [search, setSearch] = useState("");
	const [sortBy, setSortBy] = useState<string | undefined>(undefined);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(
		undefined,
	);
	// biome-ignore lint/suspicious/noExplicitAny: mock adapter
	const [filters, setFilters] = useState<any | undefined>(undefined);

	const filteredData = useMemo(() => {
		if (!search) return data;
		const lowerSearch = search.toLowerCase();
		return data.filter(
			(item) =>
				item.student.name.toLowerCase().includes(lowerSearch) ||
				item.student.nrp.toLowerCase().includes(lowerSearch),
		);
	}, [data, search]);

	const paginatedData = useMemo(() => {
		const start = (page - 1) * limit;
		return filteredData.slice(start, start + limit);
	}, [filteredData, page, limit]);

	const totalPages = Math.max(1, Math.ceil(filteredData.length / limit));

	const mockPromise = () => Promise.resolve(new URLSearchParams());

	return {
		data: {
			items: paginatedData,
			pageInfo: {
				page,
				perPage: limit,
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
			setPage(p);
			return mockPromise();
		},
		limit,
		setLimit: (l: number) => {
			setLimit(l);
			return mockPromise();
		},
		search,
		setSearch: (s: string) => {
			setSearch(s);
			return mockPromise();
		},
		sortBy,
		// biome-ignore lint/suspicious/noExplicitAny: mock adapter
		setSortBy: (s: any) => {
			setSortBy(s);
			return mockPromise();
		},
		sortOrder,
		// biome-ignore lint/suspicious/noExplicitAny: mock adapter
		setSortOrder: (s: any) => {
			setSortOrder(s);
			return mockPromise();
		},
		filters,
		// biome-ignore lint/suspicious/noExplicitAny: mock adapter
		setFilters: (f: any) => setFilters(f),
		// biome-ignore lint/suspicious/noExplicitAny: mock adapter
		params: { page, limit, search, sortBy, sortOrder } as any,
	} as unknown as UseApiPaginationReturn<LabEnrollmentItem>;
}

function EnrollmentsTab({ labId }: { labId: string }) {
	const queryClient = useQueryClient();
	const { data, refetch, isLoading, isFetching } = api
		.lab({ labId })
		.enrollment.get.useSuspenseQuery();

	useWSEvent("lab:[labId]:enrollment:update", {
		params: { labId },
		handler: (enrollment) => {
			api.lab({ labId }).enrollment.get.setQueryData(queryClient, (oldData) => {
				if (!oldData) return oldData;
				const exists = oldData.some(
					(e) => e.studentId === enrollment.studentId,
				);
				if (exists) {
					return oldData.map((e) =>
						e.studentId === enrollment.studentId ? enrollment : e,
					);
				}
				return [enrollment, ...oldData];
			});
		},
	});

	useWSEvent("lab:[labId]:enrollment:remove", {
		params: { labId },
		handler: ({ studentId }) => {
			api.lab({ labId }).enrollment.get.setQueryData(queryClient, (oldData) => {
				if (!oldData) return oldData;
				return oldData.filter((e) => e.studentId !== studentId);
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

	return (
		<DataTable
			pagination={pagination}
			columns={enrollmentColumns}
			searchPlaceholder="Search by name or NRP..."
		/>
	);
}

export default EnrollmentsTab;
