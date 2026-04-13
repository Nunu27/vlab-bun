import { useFieldContext } from "@web/hooks/form/use-app-form";
import type { DateRange } from "react-day-picker";
import DateRangeInput from "../input/date-range-input";

type DateRangeFieldProps = Omit<
	React.ComponentProps<typeof DateRangeInput>,
	"name" | "value" | "onChange" | "isInvalid" | "errors"
>;

function DateRangeField(props: DateRangeFieldProps) {
	const field = useFieldContext<DateRange | undefined>();
	const isInvalid = !field.state.meta.isValid;

	return (
		<DateRangeInput
			{...props}
			name={field.name}
			value={field.state.value}
			onChange={(val) => field.handleChange(val)}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default DateRangeField;
