import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";

type ColorInputProps = Omit<React.ComponentProps<"input">, "type" | "id"> & {
	label?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
};

function ColorInput({
	label,
	required,
	isInvalid,
	errors,
	name,
	...props
}: ColorInputProps) {
	return (
		<Field>
			{label && (
				<FieldLabel htmlFor={name} required={required}>
					{label}
				</FieldLabel>
			)}
			<Input
				type="color"
				{...props}
				id={name}
				name={name}
				aria-invalid={isInvalid}
				className="h-10 w-full cursor-pointer p-1 py-0.5 px-1"
			/>
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export default ColorInput;
