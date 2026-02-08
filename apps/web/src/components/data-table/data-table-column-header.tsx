import type { Column } from "@tanstack/react-table";
import { cn } from "@web/lib/utils";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { useDataTableContext } from "./context";

type DataTableColumnHeaderProps<TData, TValue> = {
	column: Column<TData, TValue>;
};

export function DataTableColumnHeader<TData, TValue>({
	column,
}: DataTableColumnHeaderProps<TData, TValue>) {
	const { sortBy, sortOrder, setSort } = useDataTableContext<TData>();
	const canSort = column.getCanSort();
	const { label = "", center = false } = column.columnDef.meta || {};

	const isSorted = sortBy === column.id;
	const currentSortDir = isSorted ? sortOrder : undefined;

	const handleClick = () => {
		if (!canSort) return;
		if (!isSorted) {
			setSort(column.id, "asc");
		} else if (currentSortDir === "asc") {
			setSort(column.id, "desc");
		} else {
			setSort(undefined, "asc");
		}
	};

	return (
		<div
			className={cn(
				"flex items-center",
				center ? "justify-center" : "justify-start",
				canSort ? "cursor-pointer select-none" : "",
			)}
			onClick={canSort ? handleClick : undefined}
			onKeyDown={
				canSort
					? (e) => {
							if (e.key === "Enter" || e.key === " ") handleClick();
						}
					: undefined
			}
			role={canSort ? "button" : undefined}
			tabIndex={canSort ? 0 : undefined}
		>
			{label}
			{canSort &&
				(currentSortDir === "asc" ? (
					<ArrowUpIcon className="ml-2 h-4 w-4" />
				) : currentSortDir === "desc" ? (
					<ArrowDownIcon className="ml-2 h-4 w-4" />
				) : (
					<ChevronsUpDownIcon className="ml-2 h-4 w-4" />
				))}
		</div>
	);
}
