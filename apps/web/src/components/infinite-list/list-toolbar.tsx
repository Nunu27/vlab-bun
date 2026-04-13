import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { cn } from "@web/lib/utils";
import { RefreshCwIcon, SearchIcon } from "lucide-react";
import { useDebounceCallback } from "usehooks-ts";

export type ListToolbarProps = {
	search?: string;
	onSearchChange?: (value: string) => void;
	searchPlaceholder?: string;
	isLoading?: boolean;
	onRefresh?: () => void;
	filters?: React.ReactNode;
	className?: string;
};

export function ListToolbar({
	search = "",
	onSearchChange,
	searchPlaceholder = "Search...",
	isLoading,
	onRefresh,
	filters,
	className,
}: ListToolbarProps) {
	const debouncedSearch = useDebounceCallback(
		(value: string) => onSearchChange?.(value),
		500,
	);

	return (
		<div
			className={cn(
				"flex w-full items-center justify-between gap-4",
				className,
			)}
		>
			<div className="flex flex-1 items-center gap-2">
				<div className="relative flex w-full max-w-sm items-center">
					<SearchIcon className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder={searchPlaceholder}
						defaultValue={search}
						onChange={(e) => debouncedSearch(e.target.value)}
						className="pl-8"
					/>
				</div>
				{onRefresh && (
					<Button
						variant="outline"
						size="icon"
						onClick={onRefresh}
						disabled={isLoading}
						title="Refresh"
					>
						<RefreshCwIcon className={isLoading ? "animate-spin" : ""} />
					</Button>
				)}
			</div>
			{filters && <div className="flex items-center gap-2">{filters}</div>}
		</div>
	);
}
