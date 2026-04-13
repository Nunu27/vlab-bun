import { useFieldContext } from "@web/hooks/form/use-app-form";
import TextareaInput from "../input/textarea-input";

type TextareaFieldProps = Omit<
	React.ComponentProps<typeof TextareaInput>,
	"name" | "value" | "onBlur" | "onChange" | "isInvalid" | "errors"
>;

function TextareaField(props: TextareaFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = !field.state.meta.isValid;

	return (
		<TextareaInput
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

export default TextareaField;
