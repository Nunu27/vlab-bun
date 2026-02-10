import { useFieldContext } from "@web/hooks/form/use-app-form";
import CheckboxInput from "../input/checkbox-input";

type CheckboxFieldProps = Omit<
	React.ComponentProps<typeof CheckboxInput>,
	"checked" | "onCheckedChange" | "name" | "onBlur"
> & {
	label?: string;
	required?: boolean;
};

function CheckboxField(props: CheckboxFieldProps) {
	const field = useFieldContext<boolean>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<CheckboxInput
			{...props}
			name={field.name}
			checked={field.state.value}
			onCheckedChange={(checked) => field.handleChange(checked === true)}
			onBlur={field.handleBlur}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default CheckboxField;
