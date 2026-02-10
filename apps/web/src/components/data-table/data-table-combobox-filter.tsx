import type {
	ExtractEndpointQuery,
	InfiniteEndpointItem,
} from "@web/hooks/pagination/use-api-infinite-list";
import type { UseApiPaginationReturn } from "@web/hooks/pagination/use-api-pagination";
import type { PaginationEndpoint, PaginationQuery } from "@web/types";
import { PaginatedComboboxInput } from "../input/paginated-combobox-input";

type DataTableComboboxFilterProps<
	TEndpoint extends PaginationEndpoint,
	TParentQuery extends PaginationQuery,
> = {
	endpoint: TEndpoint;
	field: NonNullable<TParentQuery> extends {
		filters?: Array<{ field: infer F }>;
	}
		? F extends string
			? F
			: string
		: string;
	pagination: UseApiPaginationReturn<unknown, TParentQuery>;
	getLabel: (item: InfiniteEndpointItem<TEndpoint>) => string;
	getValue: (item: InfiniteEndpointItem<TEndpoint>) => string;
	placeholder?: string;
	params?: Omit<ExtractEndpointQuery<TEndpoint>, "page" | "search">;
	className?: string; // e.g. for fixing the width of the filter
};

/**
 * A plug-and-play filter widget for `DataTable` toolbars.
 *
 * Pass it via the `filters` prop on `DataTable`:
 * ```tsx
 * <DataTable
 *   filters={
 *     <DataTableComboboxFilter
 *       endpoint={api.department.pagination}
 *       field="departmentId"
 *       pagination={pagination}
 *       getLabel={(d) => d.name}
 *       getValue={(d) => d.id}
 *       placeholder="Filter by department..."
 *     />
 *   }
 * />
 * ```
 */
export function DataTableComboboxFilter<
	TEndpoint extends PaginationEndpoint,
	TParentQuery extends PaginationQuery,
>({
	endpoint,
	field,
	pagination,
	getLabel,
	getValue,
	placeholder = "Filter...",
	params,
	className = "w-50",
}: DataTableComboboxFilterProps<TEndpoint, TParentQuery>) {
	const { filters, setFilters } = pagination;

	const currentFilters = filters ?? [];
	const currentFilter = currentFilters.find(
		(f) => f.field === field && f.op === "eq",
	);
	const currentValue =
		typeof currentFilter?.value === "string" ? currentFilter.value : undefined;

	const handleChange = (value: string) => {
		const withoutCurrent = currentFilters.filter(
			(f) => !(f.field === field && f.op === "eq"),
		);

		if (!value) {
			setFilters(withoutCurrent.length > 0 ? withoutCurrent : null);
		} else {
			setFilters([...withoutCurrent, { field, op: "eq" as const, value }]);
		}
	};

	return (
		<PaginatedComboboxInput
			endpoint={endpoint}
			getLabel={getLabel}
			getValue={getValue}
			placeholder={placeholder}
			params={params}
			value={currentValue}
			onChange={handleChange}
			className={className}
		/>
	);
}
