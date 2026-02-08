import { Field, FieldError, FieldLabel } from "../ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";

export type SelectOption = {
	label: string;
	value: string;
};

type SelectInputProps = React.ComponentProps<typeof Select> & {
	label?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
	name?: string;
	options: SelectOption[];
	placeholder?: string;
};

function SelectInput({
	label,
	required,
	isInvalid,
	errors,
	name,
	options,
	placeholder,
	...props
}: SelectInputProps) {
	return (
		<Field>
			{label && (
				<FieldLabel htmlFor={name} required={required}>
					{label}
				</FieldLabel>
			)}
			<Select {...props} name={name}>
				<SelectTrigger id={name} aria-invalid={isInvalid} className="w-full">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export default SelectInput;
