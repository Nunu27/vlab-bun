import { cn } from "@web/lib/utils";
import { CheckIcon, icons } from "lucide-react";
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
		<Field>
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
						className="w-full justify-start font-normal px-3"
						disabled={disabled}
						aria-invalid={isInvalid}
					>
						{value ? (
							<div className="flex items-center gap-2">
								<DynamicIcon name={value} className="size-4 shrink-0" />
								<span className="truncate">{value}</span>
							</div>
						) : (
							<span className="text-muted-foreground">{placeholder}</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-(--radix-popover-trigger-width) p-0">
					<Command shouldFilter={false}>
						<CommandInput
							placeholder={placeholder}
							value={searchQuery}
							onValueChange={setSearchQuery}
						/>
						<CommandList>
							<CommandEmpty>{emptyText}</CommandEmpty>
							<CommandGroup>
								{filteredIcons.map((iconName) => (
									<CommandItem
										key={iconName}
										value={iconName}
										onSelect={() => {
											onChange?.(iconName === value ? "" : iconName);
											setOpen(false);
										}}
										className="flex items-center gap-2"
									>
										<DynamicIcon name={iconName} className="size-4 shrink-0" />
										<span className="flex-1 truncate">{iconName}</span>
										<CheckIcon
											className={cn(
												"ml-auto size-4 shrink-0",
												value === iconName ? "opacity-100" : "opacity-0",
											)}
										/>
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

export default IconInput;
