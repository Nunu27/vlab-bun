import { useFieldContext } from "@web/hooks/form/use-app-form";
import ColorInput from "../input/color-input";

type ColorFieldProps = Omit<
	React.ComponentProps<typeof ColorInput>,
	"value" | "onChange" | "name" | "onBlur"
> & {
	label: string;
	required?: boolean;
};

function ColorField({ label, required, ...props }: ColorFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<ColorInput
			{...props}
			name={field.name}
			value={field.state.value}
			onBlur={field.handleBlur}
			onChange={(e) => field.handleChange(e.target.value)}
			label={label}
			required={required}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default ColorField;
