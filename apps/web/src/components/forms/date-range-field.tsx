import { useFieldContext } from "@web/hooks/form/use-app-form";
import type { DateRange } from "react-day-picker";
import DateRangeInput from "../input/date-range-input";

type DateRangeFieldProps = Omit<
	React.ComponentProps<typeof DateRangeInput>,
	"value" | "onChange" | "name"
> & {
	label: string;
	required?: boolean;
};

function DateRangeField({ label, required, ...props }: DateRangeFieldProps) {
	const field = useFieldContext<DateRange | undefined>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<DateRangeInput
			{...props}
			name={field.name}
			value={field.state.value}
			onChange={(val) => field.handleChange(val)}
			label={label}
			required={required}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default DateRangeField;
