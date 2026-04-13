import type {
	ExtractTreatyPaginationData,
	ExtractTreatyParams,
} from "@jawit/query/types";
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
	getLabel: (item: ExtractTreatyPaginationData<TEndpoint>) => string;
	getValue: (item: ExtractTreatyPaginationData<TEndpoint>) => string;
	placeholder?: string;
	params?: Omit<ExtractTreatyParams<TEndpoint["post"]>, "page" | "search">;
	className?: string; // e.g. for fixing the width of the filter
};

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
