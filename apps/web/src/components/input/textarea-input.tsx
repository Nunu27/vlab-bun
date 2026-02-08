import { Field, FieldError, FieldLabel } from "../ui/field";
import { Textarea } from "../ui/textarea";

type TextareaInputProps = React.ComponentProps<typeof Textarea> & {
	label?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
};

function TextareaInput({
	label,
	required,
	isInvalid,
	errors,
	name,
	...props
}: TextareaInputProps) {
	return (
		<Field>
			{label && (
				<FieldLabel htmlFor={name} required={required}>
					{label}
				</FieldLabel>
			)}
			<Textarea {...props} id={name} name={name} aria-invalid={isInvalid} />
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export default TextareaInput;
