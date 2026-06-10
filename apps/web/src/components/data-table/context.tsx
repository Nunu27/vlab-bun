import type { PaginatedData } from "@jawit/common";
import type { SortOrder } from "@web/types";
import { createContext, useContext } from "react";

export type DataTableContextValue<TItem> = {
	// Data
	data: PaginatedData<TItem> | undefined;
	isLoading: boolean;
	isFetching: boolean;

	// Pagination state (for toolbar / pagination controls)
	page: number;
	perPage: number;
	search: string;
	sortBy: string | undefined;
	sortOrder: SortOrder;
	// biome-ignore lint/suspicious/noExplicitAny: generic filters
	filters: any[] | undefined;

	// Setters
	setPage: (page: number) => void;
	setPerPage: (perPage: number) => void;
	setSearch: (search: string) => void;
	setSort: (sortBy: string | undefined, sortOrder: SortOrder) => void;
	// biome-ignore lint/suspicious/noExplicitAny: generic filters
	setFilters: (filters: any[] | null) => void;
	refresh: () => void;
};

// biome-ignore lint/suspicious/noExplicitAny: context default must be any to allow generic param
const DataTableContext = createContext<DataTableContextValue<any> | null>(null);

export const DataTableProvider = DataTableContext.Provider;

export function useDataTableContext<TItem>(): DataTableContextValue<TItem> {
	const ctx = useContext(DataTableContext);
	if (!ctx) {
		throw new Error("useDataTableContext must be used inside <DataTable>");
	}
	return ctx as DataTableContextValue<TItem>;
}
