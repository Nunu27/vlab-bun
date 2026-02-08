import { useFieldContext } from "@web/hooks/form/use-app-form";
import DateInput from "../input/date-input";

type DateFieldProps = Omit<
	React.ComponentProps<typeof DateInput>,
	"value" | "onChange" | "name"
> & {
	label: string;
	required?: boolean;
};

function DateField({ label, required, ...props }: DateFieldProps) {
	const field = useFieldContext<Date | undefined>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<DateInput
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

export default DateField;
