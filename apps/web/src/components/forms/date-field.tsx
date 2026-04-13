import { useFieldContext } from "@web/hooks/form/use-app-form";
import DateInput from "../input/date-input";

type DateFieldProps = Omit<
	React.ComponentProps<typeof DateInput>,
	"name" | "value" | "onChange" | "isInvalid" | "errors"
>;

function DateField(props: DateFieldProps) {
	const field = useFieldContext<Date | undefined>();
	const isInvalid = !field.state.meta.isValid;

	return (
		<DateInput
			{...props}
			name={field.name}
			value={field.state.value}
			onChange={(val) => field.handleChange(val)}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default DateField;
