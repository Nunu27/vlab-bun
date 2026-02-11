import { cn } from "@web/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type DateInputProps = {
	label?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
	name?: string;
	placeholder?: string;
	value?: Date;
	onChange?: (date: Date | undefined) => void;
	disabled?: boolean;
	formatStr?: string;
};

function DateInput({
	label,
	required,
	isInvalid,
	errors,
	name,
	placeholder = "Pick a date",
	value,
	onChange,
	disabled,
	formatStr = "PPP",
}: DateInputProps) {
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
							"w-full justify-start px-3 text-left font-normal",
							!value && "text-muted-foreground",
						)}
					>
						<CalendarIcon className="mr-2 size-4 shrink-0 opacity-50" />
						{value ? format(value, formatStr) : <span>{placeholder}</span>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={value}
						onSelect={onChange}
						initialFocus
					/>
				</PopoverContent>
			</Popover>
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export default DateInput;
