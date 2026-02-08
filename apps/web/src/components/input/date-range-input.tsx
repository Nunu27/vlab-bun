import { cn } from "@web/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type DateRangeInputProps = {
	label?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
	name?: string;
	placeholder?: string;
	value?: DateRange;
	onChange?: (date: DateRange | undefined) => void;
	disabled?: boolean;
	formatStr?: string;
};

function DateRangeInput({
	label,
	required,
	isInvalid,
	errors,
	name,
	placeholder = "Pick a date range",
	value,
	onChange,
	disabled,
	formatStr = "LLL dd, y",
}: DateRangeInputProps) {
	return (
		<Field className="flex flex-col">
			{label && (
				<FieldLabel htmlFor={name} required={required}>
					{label}
				</FieldLabel>
			)}
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id={name}
						variant={"outline"}
						disabled={disabled}
						aria-invalid={isInvalid}
						className={cn(
							"w-full justify-start text-left font-normal px-3",
							!value && "text-muted-foreground",
						)}
					>
						<CalendarIcon className="mr-2 size-4 opacity-50 shrink-0" />
						{value?.from ? (
							value.to ? (
								<>
									{format(value.from, formatStr)} -{" "}
									{format(value.to, formatStr)}
								</>
							) : (
								format(value.from, formatStr)
							)
						) : (
							<span>{placeholder}</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						initialFocus
						mode="range"
						defaultMonth={value?.from}
						selected={value}
						onSelect={onChange}
						numberOfMonths={2}
					/>
				</PopoverContent>
			</Popover>
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export default DateRangeInput;
