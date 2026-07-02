import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { Spinner } from "@web/components/ui/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web/components/ui/table";
import { calculateTableSizing } from "@web/helper/table";
import type { UseApiPaginationReturn } from "@web/hooks/pagination/use-api-pagination";
import { CircleQuestionMarkIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { DataTableProvider } from "./context";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";

export type DataTableProps<TData> = {
	/** Result from `useApiPagination()`: provides data + all state/setters */
	pagination: UseApiPaginationReturn<TData>;
	/** Column definitions from `@tanstack/react-table` */
	columns: ColumnDef<TData>[];
	/** Page size options shown in the rows-per-page selector */
	pageSizeOptions?: number[];
	/** Placeholder text for the search input */
	searchPlaceholder?: string;
	/** Message shown when there are no results */
	emptyMessage?: string;
	/** Icon shown in the empty state */
	emptyIcon?: React.ReactNode;
	/** Slot for custom filter UI (rendered in toolbar right side) */
	filters?: React.ReactNode;
};

export function DataTable<TData>({
	pagination,
	columns,
	pageSizeOptions,
	searchPlaceholder,
	emptyMessage = "No results.",
	filters,
}: DataTableProps<TData>) {
	const tableContainerRef = useRef<HTMLDivElement>(null);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

	const { data, isLoading, sortBy, sortOrder } = pagination;

	// Keep TanStack sorting state in sync with URL state (controlled)
	const sorting: SortingState =
		sortBy && sortOrder ? [{ id: sortBy, desc: sortOrder === "desc" }] : [];

	const table = useReactTable({
		data: data?.items ?? [],
		columns,
		state: {
			sorting,
			columnVisibility,
			columnFilters,
			pagination: {
				pageIndex: (data?.pageInfo.page ?? 1) - 1,
				pageSize: data?.pageInfo.perPage ?? 10,
			},
		},
		pageCount: data?.pageInfo.totalPages ?? -1,
		manualPagination: true,
		manualSorting: true,
		enableMultiSort: false,
		// Sort changes are handled via context setters, so we override the default:
		onSortingChange: () => undefined,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
	});

	const headers = table.getFlatHeaders();

	useLayoutEffect(() => {
		if (tableContainerRef.current) {
			const initialColumnSizing = calculateTableSizing(
				headers,
				tableContainerRef.current?.clientWidth,
			);
			table.setColumnSizing(initialColumnSizing);
		}
	}, [headers, table.setColumnSizing]);

	return (
		<DataTableProvider value={pagination}>
			<div className="w-full space-y-4">
				<DataTableToolbar
					table={table}
					searchPlaceholder={searchPlaceholder}
					filters={filters}
				/>
				<div className="relative flex flex-col gap-4">
					<div
						ref={tableContainerRef}
						className="overflow-hidden rounded-lg border"
						style={{
							direction: table.options.columnResizeDirection,
						}}
					>
						<Table className="w-full">
							<TableHeader className="bg-muted">
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map((header) => (
											<TableHead
												key={header.id}
												className="border-r last:border-r-0"
												style={{
													width:
														header.getSize() !== 150
															? header.getSize()
															: undefined,
												}}
											>
												{header.isPlaceholder ? null : (
													<DataTableColumnHeader column={header.column} />
												)}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody className="relative">
								{isLoading && (
									<tr className="pointer-events-none absolute inset-0 z-20">
										<td className="h-full w-full">
											<div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
												<div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-card-foreground shadow-sm">
													<Spinner className="h-4 w-4" />
													<span className="font-medium text-sm">Loading</span>
												</div>
											</div>
										</td>
									</tr>
								)}
								{table.getRowModel().rows?.length ? (
									table.getRowModel().rows.map((row) => (
										<TableRow
											key={row.id}
											data-state={row.getIsSelected() && "selected"}
										>
											{row.getVisibleCells().map((cell) => (
												<TableCell
													key={cell.id}
													className="border-r last:border-r-0"
													style={{
														width: cell.column.columnDef.size
															? cell.column.getSize()
															: "auto",
													}}
												>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</TableCell>
											))}
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={columns.length} className="py-16">
											<Empty>
												<EmptyHeader>
													<EmptyMedia variant="icon">
														<CircleQuestionMarkIcon />
													</EmptyMedia>
													<EmptyTitle>{emptyMessage}</EmptyTitle>
												</EmptyHeader>
											</Empty>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
					<DataTablePagination pageSizeOptions={pageSizeOptions} />
				</div>
			</div>
		</DataTableProvider>
	);
}
