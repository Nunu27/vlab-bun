import { useFieldContext } from "@web/hooks/form/use-app-form";
import ColorInput from "../input/color-input";

type ColorFieldProps = Omit<
	React.ComponentProps<typeof ColorInput>,
	"name" | "value" | "onBlur" | "onChange" | "isInvalid" | "errors"
>;

function ColorField(props: ColorFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = !field.state.meta.isValid;

	return (
		<ColorInput
			{...props}
			name={field.name}
			value={field.state.value}
			onBlur={field.handleBlur}
			onChange={(e) => field.handleChange(e.target.value)}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default ColorField;
