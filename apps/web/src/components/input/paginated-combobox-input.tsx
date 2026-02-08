import {
	type ExtractEndpointQuery,
	type InfiniteEndpointItem,
	useApiInfiniteList,
} from "@web/hooks/pagination/use-api-infinite-list";
import { cn } from "@web/lib/utils";
import type { PaginationEndpoint } from "@web/types";
import { CheckIcon, ChevronDownIcon, Loader2Icon } from "lucide-react";
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
	params?: Omit<ExtractEndpointQuery<TEndpoint>, "page" | "search">;
	getLabel: (item: InfiniteEndpointItem<TEndpoint>) => string;
	getValue: (item: InfiniteEndpointItem<TEndpoint>) => string;
	placeholder?: string;
	emptyText?: string;
	value?: string;
	// defaultLabel allows displaying the label in edit mode if the item is not loaded initially
	defaultLabel?: string;
	onChange?: (value: string) => void;
	disabled?: boolean;
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
		} as Omit<ExtractEndpointQuery<TEndpoint>, "page">,
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
		<Field>
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
						className="w-full justify-between"
						disabled={disabled}
						aria-invalid={isInvalid}
					>
						{displayLabel}
						<ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-(--radix-popover-trigger-width) p-0">
					<Command shouldFilter={false}>
						<CommandInput placeholder={placeholder} onValueChange={setSearch} />
						<CommandList>
							{(isLoading || (isFetching && items.length === 0)) && (
								<div className="py-6 text-center text-sm flex items-center justify-center">
									<Loader2Icon className="size-4 animate-spin text-muted-foreground mr-2" />
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
											value={itemLabel} // Note: since shouldFilter={false}, this doesn't affect fuzzy search anymore, but used for accessibility
											onSelect={() => {
												onChange?.(itemValue === value ? "" : itemValue);
												setOpen(false);
											}}
										>
											{itemLabel}
											<CheckIcon
												className={cn(
													"ml-auto size-4",
													value === itemValue ? "opacity-100" : "opacity-0",
												)}
											/>
										</CommandItem>
									);
								})}
							</CommandGroup>
							{/* Intersection Observer trigger */}
							{hasNextPage && (
								<div
									ref={ref}
									className="py-2 flex items-center justify-center text-sm text-muted-foreground"
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
