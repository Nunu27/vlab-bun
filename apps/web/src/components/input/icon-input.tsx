import { icons } from "lucide-react";
import { useMemo, useState } from "react";
import { DynamicIcon } from "../dynamic-icon";
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

type IconInputProps = {
	label?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
	name?: string;
	placeholder?: string;
	emptyText?: string;
	value?: string;
	onChange?: (value: string) => void;
	disabled?: boolean;
	className?: string; // e.g. for width control
};

// Limit how many we render to prevent slowdowns.
const MAX_ICONS = 50;
const allIconNames = Object.keys(icons).filter(
	(name) => name !== "createLucideIcon" && name !== "LucideIcon", // Exclude utilities
);

function IconInput({
	label,
	required,
	isInvalid,
	errors,
	name,
	placeholder = "Search icon...",
	emptyText = "No icon found.",
	value,
	onChange,
	disabled,
	className,
}: IconInputProps) {
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const filteredIcons = useMemo(() => {
		if (!searchQuery) return allIconNames.slice(0, MAX_ICONS);
		const lowerQuery = searchQuery.toLowerCase();
		return allIconNames
			.filter((icon) => icon.toLowerCase().includes(lowerQuery))
			.slice(0, MAX_ICONS);
	}, [searchQuery]);

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
						className="aspect-square h-auto w-full justify-center p-0 font-normal"
						disabled={disabled}
						aria-invalid={isInvalid}
					>
						{value ? (
							<DynamicIcon name={value} className="size-16 text-primary" />
						) : (
							<span className="text-muted-foreground">Select</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[320px] p-0">
					<Command shouldFilter={false}>
						<CommandInput
							placeholder={placeholder}
							value={searchQuery}
							onValueChange={setSearchQuery}
						/>
						<CommandList>
							<CommandEmpty>{emptyText}</CommandEmpty>
							<CommandGroup>
								<div className="grid grid-cols-4 gap-1 pb-2">
									{filteredIcons.map((iconName) => (
										<CommandItem
											key={iconName}
											value={iconName}
											data-checked={value === iconName}
											onSelect={() => {
												onChange?.(iconName === value ? "" : iconName);
												setOpen(false);
											}}
											className="relative flex h-16 flex-col items-center justify-center p-0 [&>svg:last-child]:hidden"
										>
											<DynamicIcon
												name={iconName}
												className="size-6 shrink-0"
											/>
											<span className="truncate text-[10px]">{iconName}</span>
										</CommandItem>
									))}
								</div>
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export default IconInput;
