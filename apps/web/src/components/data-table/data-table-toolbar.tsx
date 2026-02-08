import type { Table as TanStackTable } from "@tanstack/react-table";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { MultiComboBox } from "@web/components/ui/multi-combobox";
import { LayoutListIcon, RefreshCwIcon } from "lucide-react";
import { useMemo, useRef } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useDataTableContext } from "./context";

type DataTableToolbarProps<TData> = {
	table: TanStackTable<TData>;
	searchPlaceholder?: string;
	/** Slot for custom filter UI rendered on the right side of the toolbar */
	filters?: React.ReactNode;
};

export function DataTableToolbar<TData>({
	table,
	searchPlaceholder = "Search...",
	filters,
}: DataTableToolbarProps<TData>) {
	const { search, isLoading, setSearch, refresh } =
		useDataTableContext<TData>();

	const inputRef = useRef<HTMLInputElement>(null);
	const debouncedSearch = useDebounceCallback(setSearch, 500);

	const hideableColumns = useMemo(
		() =>
			table
				.getAllColumns()
				.filter(
					(column) =>
						typeof column.accessorFn !== "undefined" && column.getCanHide(),
				),
		[table],
	);

	const columnOptions = hideableColumns.map((column) => ({
		value: column.id,
		label: column.columnDef.meta?.label || column.id,
		checked: column.getIsVisible(),
	}));

	const handleColumnToggle = (columnId: string, checked: boolean) => {
		const column = table.getColumn(columnId);
		if (column) {
			column.toggleVisibility(checked);
		}
	};

	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex flex-1 items-center gap-2">
				<Input
					ref={inputRef}
					type="search"
					placeholder={searchPlaceholder}
					defaultValue={search}
					onChange={(e) => debouncedSearch(e.target.value)}
					className="max-w-sm"
				/>
				<Button
					variant="outline"
					size="icon"
					onClick={refresh}
					disabled={isLoading}
					title="Refresh"
				>
					<RefreshCwIcon className={isLoading ? "animate-spin" : ""} />
				</Button>
			</div>
			<div className="flex items-center gap-2">
				{filters}
				{!!hideableColumns.length && (
					<MultiComboBox
						options={columnOptions}
						onChange={handleColumnToggle}
						placeholder="Select columns..."
						emptyMessage="No columns found."
						icon={<LayoutListIcon />}
						label="Columns"
						width="w-[200px]"
					/>
				)}
			</div>
		</div>
	);
}
