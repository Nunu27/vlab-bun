import { Label } from "@web/components/ui/label";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationFirst,
	PaginationItem,
	PaginationLast,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@web/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web/components/ui/select";
import { useDataTableContext } from "./context";

type DataTablePaginationProps = {
	pageSizeOptions?: number[];
};

export function DataTablePagination({
	pageSizeOptions = [10, 20, 30, 40, 50],
}: DataTablePaginationProps) {
	const { data, isLoading, page, perPage, setPage, setPerPage } =
		useDataTableContext();

	const pageInfo = data?.pageInfo;

	const {
		page: currentPage = page,
		perPage: currentPerPage = perPage,
		total = 0,
		totalPages = 0,
	} = pageInfo ?? {};

	const from = Math.min((currentPage - 1) * currentPerPage + 1, total);
	const to = Math.min(currentPage * currentPerPage, total);

	const canGoPrev = currentPage > 1 && !isLoading;
	const canGoNext = currentPage < totalPages && !isLoading;
	const canGoFirst = currentPage > 1 && !isLoading;
	const canGoLast = currentPage < totalPages && !isLoading;

	const showLeftEllipsis = currentPage > 2;
	const showRightEllipsis = currentPage < totalPages - 1;

	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<Label htmlFor="rows-per-page" className="text-sm font-medium">
					Rows per page
				</Label>
				<Select
					value={`${currentPerPage}`}
					onValueChange={(value) => setPerPage(Number(value))}
					disabled={isLoading}
				>
					<SelectTrigger size="sm" className="w-20" id="rows-per-page">
						<SelectValue />
					</SelectTrigger>
					<SelectContent side="top">
						{pageSizeOptions.map((pageSize) => (
							<SelectItem key={pageSize} value={`${pageSize}`}>
								{pageSize}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<Pagination>
				<PaginationContent>
					<PaginationItem className="text-muted-foreground text-sm">
						{from ?? "?"}-{to ?? "?"} of {total ?? "?"}
					</PaginationItem>

					<PaginationItem>
						<PaginationFirst
							onClick={canGoFirst ? () => setPage(1) : undefined}
							className={canGoFirst ? undefined : "opacity-50"}
							aria-label="Go to first page"
						/>
					</PaginationItem>

					<PaginationItem>
						<PaginationPrevious
							onClick={canGoPrev ? () => setPage(currentPage - 1) : undefined}
							className={canGoPrev ? undefined : "opacity-50"}
							aria-label="Go to previous page"
						/>
					</PaginationItem>

					{showLeftEllipsis && (
						<PaginationItem>
							<PaginationEllipsis />
						</PaginationItem>
					)}

					{currentPage > 1 && (
						<PaginationItem>
							<PaginationLink
								onClick={() => setPage(currentPage - 1)}
								aria-label={`Go to page ${currentPage - 1}`}
							>
								{currentPage - 1}
							</PaginationLink>
						</PaginationItem>
					)}

					<PaginationItem>
						<PaginationLink
							isActive
							disabled
							aria-label={`Current page ${currentPage}`}
							aria-current="page"
						>
							{currentPage}
						</PaginationLink>
					</PaginationItem>

					{currentPage < totalPages && (
						<PaginationItem>
							<PaginationLink
								onClick={() => setPage(currentPage + 1)}
								aria-label={`Go to page ${currentPage + 1}`}
							>
								{currentPage + 1}
							</PaginationLink>
						</PaginationItem>
					)}

					{showRightEllipsis && (
						<PaginationItem>
							<PaginationEllipsis />
						</PaginationItem>
					)}

					<PaginationItem>
						<PaginationNext
							onClick={canGoNext ? () => setPage(currentPage + 1) : undefined}
							className={
								canGoNext ? "cursor-pointer" : "pointer-events-none opacity-50"
							}
							aria-label="Go to next page"
						/>
					</PaginationItem>

					<PaginationItem>
						<PaginationLast
							onClick={canGoLast ? () => setPage(totalPages) : undefined}
							className={
								canGoLast ? "cursor-pointer" : "pointer-events-none opacity-50"
							}
							aria-label="Go to last page"
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	);
}
