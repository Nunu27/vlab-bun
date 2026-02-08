import { useFieldContext } from "@web/hooks/form/use-app-form";
import TextareaInput from "../input/textarea-input";

type TextareaFieldProps = Omit<
	React.ComponentProps<typeof TextareaInput>,
	"value" | "onChange" | "name" | "onBlur"
> & {
	label: string;
	required?: boolean;
};

function TextareaField({ label, required, ...props }: TextareaFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<TextareaInput
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

export default TextareaField;
