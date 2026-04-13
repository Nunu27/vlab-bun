import { Button } from "@web/components/ui/button";
import { Empty, EmptyDescription } from "@web/components/ui/empty";
import { Spinner } from "@web/components/ui/spinner";
import type { UseApiInfiniteListReturn } from "@web/hooks/pagination/use-api-infinite-list";
import { cn } from "@web/lib/utils";
import { useEffect, useRef } from "react";

export type InfiniteListProps<TItem> = UseApiInfiniteListReturn<TItem> & {
	// --- Rendering ---
	/** Render a single item */
	renderItem: (item: TItem, index: number) => React.ReactNode;
	/** Render a loading skeleton/placeholder while initially fetching */
	renderLoading?: () => React.ReactNode;
	/** Render the empty state when there are no items */
	renderEmpty?: () => React.ReactNode;
	/**
	 * Render a custom "Load more" button.
	 * If not provided a default button is shown.
	 * Only relevant when `autoLoad` is false.
	 */
	renderLoadMore?: (props: {
		onClick: () => void;
		disabled: boolean;
		isFetching: boolean;
	}) => React.ReactNode;

	// --- Behaviour ---
	/**
	 * Automatically load more items when the user scrolls near the bottom.
	 * Uses an `IntersectionObserver` sentinel element.
	 * @default true
	 */
	autoLoad?: boolean;

	// --- Layout ---
	className?: string;
	itemClassName?: string;
};

function DefaultLoadMore({
	onClick,
	disabled,
	isFetching,
}: {
	onClick: () => void;
	disabled: boolean;
	isFetching: boolean;
}) {
	return (
		<div className="flex justify-center pt-4">
			<Button variant="outline" onClick={onClick} disabled={disabled}>
				{isFetching ? (
					<>
						<Spinner className="mr-2 h-4 w-4" />
						Loading...
					</>
				) : (
					"Load more"
				)}
			</Button>
		</div>
	);
}

function DefaultEmpty() {
	return (
		<Empty className="border-0 py-16">
			<EmptyDescription>No items found.</EmptyDescription>
		</Empty>
	);
}

function DefaultLoading() {
	return (
		<div className="flex items-center justify-center py-16">
			<Spinner className="h-6 w-6" />
		</div>
	);
}

export function InfiniteList<TItem>({
	items,
	fetchNextPage,
	hasNextPage,
	isFetchingNextPage,
	isLoading,
	renderItem,
	renderLoading = DefaultLoading,
	renderEmpty = DefaultEmpty,
	renderLoadMore,
	autoLoad = true,
	className,
	itemClassName,
}: InfiniteListProps<TItem>) {
	const sentinelRef = useRef<HTMLDivElement>(null);

	// IntersectionObserver-based auto-load
	useEffect(() => {
		if (!autoLoad) return;
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [autoLoad, hasNextPage, isFetchingNextPage, fetchNextPage]);

	if (isLoading) {
		return <>{renderLoading()}</>;
	}

	if (items.length === 0) {
		return <>{renderEmpty()}</>;
	}

	return (
		<div className={cn("flex flex-col", className)}>
			{items.map((item, index) => (
				<div key={index.toString()} className={itemClassName}>
					{renderItem(item, index)}
				</div>
			))}

			{/* Sentinel for IntersectionObserver auto-load */}
			{autoLoad && <div ref={sentinelRef} className="h-1" aria-hidden />}

			{/* Auto-load spinner */}
			{autoLoad && isFetchingNextPage && (
				<div className="flex justify-center py-4">
					<Spinner className="h-5 w-5" />
				</div>
			)}

			{/* Manual "Load more" button (only when autoLoad is false) */}
			{!autoLoad &&
				hasNextPage &&
				(renderLoadMore ? (
					renderLoadMore({
						onClick: fetchNextPage,
						disabled: isFetchingNextPage,
						isFetching: isFetchingNextPage,
					})
				) : (
					<DefaultLoadMore
						onClick={fetchNextPage}
						disabled={isFetchingNextPage}
						isFetching={isFetchingNextPage}
					/>
				))}
		</div>
	);
}
