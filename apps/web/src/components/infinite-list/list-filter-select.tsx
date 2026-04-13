import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web/components/ui/select";
import { cn } from "@web/lib/utils";

export type ListFilterOption = {
	label: string;
	value: string;
};

export type ListFilterSelectProps = {
	options: ListFilterOption[];
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
};

export function ListFilterSelect({
	options,
	value,
	onChange,
	placeholder = "Order by...",
	className,
}: ListFilterSelectProps) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger
				className={cn("h-9 w-auto min-w-37.5 font-normal shadow-xs", className)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
