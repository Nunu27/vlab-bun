import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";

type TextInputProps = React.ComponentProps<"input"> & {
	label?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
};

function TextInput({
	label,
	required,
	isInvalid,
	errors,
	...props
}: TextInputProps) {
	return (
		<Field>
			{label && (
				<FieldLabel htmlFor={props.name} required={required}>
					{label}
				</FieldLabel>
			)}
			<Input {...props} aria-invalid={isInvalid} />
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export default TextInput;
