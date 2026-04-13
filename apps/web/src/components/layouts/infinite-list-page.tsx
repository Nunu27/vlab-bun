import { InfiniteList, ListToolbar } from "@web/components/infinite-list";
import { PageHeading } from "@web/components/sections/page-heading";
import type { UseApiInfiniteListReturn } from "@web/hooks/pagination/use-api-infinite-list";
import type { ReactNode } from "react";

interface InfiniteListPageProps<T> {
	title: string;
	subtitle?: string;
	search: string;
	onSearchChange: (value: string) => void;
	searchPlaceholder?: string;
	filters?: ReactNode;
	list: UseApiInfiniteListReturn<T> & {
		refetch: () => void;
		isFetching: boolean;
	};
	renderItem: (item: T, index: number) => ReactNode;
	listClassName?: string;
}

export function InfiniteListPage<T>({
	title,
	subtitle,
	search,
	onSearchChange,
	searchPlaceholder,
	filters,
	list,
	renderItem,
	listClassName = "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
}: InfiniteListPageProps<T>) {
	return (
		<div className="flex h-full flex-col gap-6">
			<PageHeading title={title} subtitle={subtitle} />
			<ListToolbar
				search={search}
				onSearchChange={onSearchChange}
				searchPlaceholder={searchPlaceholder}
				isLoading={list.isFetching}
				onRefresh={list.refetch}
				filters={filters}
			/>
			<InfiniteList
				{...list}
				className={listClassName}
				renderItem={renderItem}
			/>
		</div>
	);
}
