import type {
	ExtractTreatyPaginationData,
	ExtractTreatyParams,
} from "@jawit/query/types";
import { useApiInfiniteList } from "@web/hooks/pagination/use-api-infinite-list";
import { cn } from "@web/lib/utils";
import type { PaginationEndpoint } from "@web/types";
import { ChevronDownIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounceValue, useIntersectionObserver } from "usehooks-ts";
import { Button } from "../ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "../ui/command";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type PaginatedComboboxInputProps<TEndpoint extends PaginationEndpoint> = {
	label?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
	name?: string;
	endpoint: TEndpoint;
	params?: Omit<ExtractTreatyParams<TEndpoint["post"]>, "page" | "search">;
	getLabel: (item: ExtractTreatyPaginationData<TEndpoint>) => string;
	getValue: (item: ExtractTreatyPaginationData<TEndpoint>) => string;
	placeholder?: string;
	emptyText?: string;
	value?: string;
	// defaultLabel allows displaying the label in edit mode if the item is not loaded initially
	defaultLabel?: string;
	onChange?: (value: string) => void;
	disabled?: boolean;
	className?: string; // e.g. for width control
};

export function PaginatedComboboxInput<TEndpoint extends PaginationEndpoint>({
	label,
	required,
	isInvalid,
	errors,
	name,
	endpoint,
	params,
	getLabel,
	getValue,
	placeholder = "Select an option...",
	emptyText = "No results found.",
	value,
	defaultLabel,
	onChange,
	disabled,
	className,
}: PaginatedComboboxInputProps<TEndpoint>) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useDebounceValue("", 500);

	const {
		items,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isFetching,
	} = useApiInfiniteList(endpoint, {
		params: {
			...(params ?? {}),
			search: search || undefined,
		} as NonNullable<Parameters<TEndpoint["post"]["usePagination"]>[0]>,
	});

	const onOpenChange = (open: boolean) => {
		setOpen(open);
		setSearch("");
	};

	const { isIntersecting, ref } = useIntersectionObserver({
		threshold: 0.5,
	});

	useEffect(() => {
		if (isIntersecting && hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

	const [cachedLabel, setCachedLabel] = useState<string | undefined>(
		defaultLabel,
	);

	useEffect(() => {
		const item = items.find((i) => getValue(i) === value);
		if (item) {
			setCachedLabel(getLabel(item));
		} else if (!value) {
			setCachedLabel(defaultLabel);
		}
	}, [items, value, getValue, getLabel, defaultLabel]);

	const displayLabel = cachedLabel || placeholder;

	return (
		<Field className={className}>
			{label && (
				<FieldLabel htmlFor={name} required={required}>
					{label}
				</FieldLabel>
			)}
			<Popover open={open} onOpenChange={onOpenChange}>
				<PopoverTrigger asChild>
					<Button
						id={name}
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className={cn(
							"w-full justify-between bg-transparent px-2.5 font-normal shadow-xs hover:bg-transparent aria-expanded:bg-transparent dark:bg-input/30 dark:aria-expanded:bg-input/50 dark:hover:bg-input/50",
							!value &&
								"text-muted-foreground aria-expanded:text-muted-foreground",
						)}
						disabled={disabled}
						aria-invalid={isInvalid}
					>
						<span className="flex-1 truncate text-left">{displayLabel}</span>
						<ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-(--radix-popover-trigger-width) p-0">
					<Command shouldFilter={false}>
						<CommandInput placeholder={placeholder} onValueChange={setSearch} />
						<CommandList>
							{(isLoading || (isFetching && items.length === 0)) && (
								<div className="flex items-center justify-center py-6 text-center text-sm">
									<Loader2Icon className="mr-2 size-4 animate-spin text-muted-foreground" />
									Loading...
								</div>
							)}
							{!isLoading && items.length === 0 && (
								<CommandEmpty>{emptyText}</CommandEmpty>
							)}
							<CommandGroup>
								{items.map((item) => {
									const itemValue = getValue(item);
									const itemLabel = getLabel(item);

									return (
										<CommandItem
											key={itemValue}
											value={itemLabel}
											data-checked={value === itemValue}
											onSelect={() => {
												onChange?.(itemValue === value ? "" : itemValue);
												setOpen(false);
											}}
										>
											<span className="truncate">{itemLabel}</span>
										</CommandItem>
									);
								})}
							</CommandGroup>
							{/* Intersection Observer trigger */}
							{hasNextPage && (
								<div
									ref={ref}
									className="flex items-center justify-center py-2 text-muted-foreground text-sm"
								>
									{isFetchingNextPage ? (
										<Loader2Icon className="size-4 animate-spin" />
									) : (
										"Load more"
									)}
								</div>
							)}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export default PaginatedComboboxInput;
