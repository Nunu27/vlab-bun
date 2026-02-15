import { useFieldContext } from "@web/hooks/form/use-app-form";
import TextInput from "../input/text-input";

type TextFieldProps = React.ComponentProps<"input"> & {
	label?: string;
	required?: boolean;
};

function TextField(props: TextFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = !field.state.meta.isValid;

	return (
		<TextInput
			{...props}
			id={field.name}
			name={field.name}
			value={field.state.value}
			onBlur={field.handleBlur}
			onChange={(e) => field.handleChange(e.target.value)}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default TextField;
