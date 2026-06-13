import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "../ui/input-group";

type TextInputProps = React.ComponentProps<"input"> & {
	label?: string;
	description?: string;
	required?: boolean;
	isInvalid?: boolean;
	errors?: Array<{ message?: string }>;
};

function TextInput({
	label,
	description,
	required,
	isInvalid,
	errors,
	type,
	...props
}: TextInputProps) {
	const [showPassword, setShowPassword] = useState(false);

	return (
		<Field>
			{label && (
				<FieldLabel
					htmlFor={props.name}
					required={required}
					description={description}
				>
					{label}
				</FieldLabel>
			)}
			{type === "password" ? (
				<InputGroup aria-invalid={isInvalid}>
					<InputGroupInput
						{...props}
						type={showPassword ? "text" : "password"}
						aria-invalid={isInvalid}
					/>
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							variant="ghost"
							size="icon-xs"
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							tabIndex={-1}
						>
							{showPassword ? <EyeOff /> : <Eye />}
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			) : (
				<Input {...props} type={type} aria-invalid={isInvalid} />
			)}
			{isInvalid && <FieldError errors={errors} />}
		</Field>
	);
}

export default TextInput;
