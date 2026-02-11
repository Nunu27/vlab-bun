import { Checkbox } from "../ui/checkbox";
import { Field, FieldContent, FieldError, FieldLabel } from "../ui/field";

type CheckboxInputProps = Omit<React.ComponentProps<typeof Checkbox>, "id"> & {
	label?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
	name?: string;
};

function CheckboxInput({
	label,
	required,
	isInvalid,
	errors,
	name,
	...props
}: CheckboxInputProps) {
	return (
		<Field orientation="horizontal" className="items-start gap-3">
			<Checkbox
				{...props}
				name={name}
				id={name}
				aria-invalid={isInvalid}
				className="mt-0.5"
			/>
			{(label || isInvalid) && (
				<FieldContent>
					{label && (
						<FieldLabel
							htmlFor={name}
							required={required}
							className="m-0 w-auto border-none bg-transparent p-0 font-normal"
						>
							{label}
						</FieldLabel>
					)}
					{isInvalid && <FieldError errors={errors} />}
				</FieldContent>
			)}
		</Field>
	);
}

export default CheckboxInput;
