import { useFieldContext } from "@web/hooks/form/use-app-form";
import ComboboxInput from "../input/combobox-input";

type ComboboxFieldProps = Omit<
	React.ComponentProps<typeof ComboboxInput>,
	"value" | "onChange" | "name"
> & {
	label: string;
	required?: boolean;
};

function ComboboxField({ label, required, ...props }: ComboboxFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<ComboboxInput
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

export default ComboboxField;
