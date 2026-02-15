import { Field, FieldContent, FieldError, FieldLabel } from "../ui/field";
import { Switch } from "../ui/switch";

type SwitchInputProps = Omit<
	React.ComponentProps<typeof Switch>,
	"id" | "checked" | "onCheckedChange"
> & {
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	label?: string;
	description?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
	name?: string;
};

function SwitchInput({
	label,
	description,
	required,
	isInvalid,
	errors,
	name,
	...props
}: SwitchInputProps) {
	return (
		<Field orientation="horizontal" className="items-center gap-3">
			<Switch {...props} id={name} name={name} aria-invalid={isInvalid} />
			{(label || description || isInvalid) && (
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
					{description && (
						<p className="text-muted-foreground text-xs">{description}</p>
					)}
					{isInvalid && <FieldError errors={errors} />}
				</FieldContent>
			)}
		</Field>
	);
}

export default SwitchInput;
