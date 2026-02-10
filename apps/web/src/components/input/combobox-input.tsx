import { cn } from "@web/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";
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

export type ComboboxOption = {
	label: string;
	value: string;
};

type ComboboxInputProps = {
	label?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
	name?: string;
	options: ComboboxOption[];
	placeholder?: string;
	emptyText?: string;
	value?: string;
	onChange?: (value: string) => void;
	disabled?: boolean;
	className?: string; // e.g. for width control
};

function ComboboxInput({
	label,
	required,
	isInvalid,
	errors,
	name,
	options,
	placeholder = "Select an option...",
	emptyText = "No results found.",
	value,
	onChange,
	disabled,
	className,
}: ComboboxInputProps) {
	const [open, setOpen] = useState(false);
	const [cachedLabel, setCachedLabel] = useState<string | undefined>();

	useEffect(() => {
		const option = options.find((o) => o.value === value);
		if (option) {
			setCachedLabel(option.label);
		} else if (!value) {
			setCachedLabel(undefined);
		}
	}, [options, value]);

	const displayLabel = cachedLabel || placeholder;

	return (
		<Field className={className}>
			{label && (
				<FieldLabel htmlFor={name} required={required}>
					{label}
				</FieldLabel>
			)}
			<Popover open={open} onOpenChange={setOpen}>
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
					<Command>
						<CommandInput placeholder={placeholder} />
						<CommandList>
							<CommandEmpty>{emptyText}</CommandEmpty>
							<CommandGroup>
								{options.map((option) => (
									<CommandItem
										key={option.value}
										value={option.label}
										data-checked={value === option.value}
										onSelect={() => {
											onChange?.(option.value === value ? "" : option.value);
											setOpen(false);
										}}
									>
										<span className="truncate">{option.label}</span>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export default ComboboxInput;
