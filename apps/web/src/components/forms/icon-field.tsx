import { useFieldContext } from "@web/hooks/form/use-app-form";
import IconInput from "../input/icon-input";

type IconFieldProps = Omit<
	React.ComponentProps<typeof IconInput>,
	"value" | "onChange" | "name"
> & {
	label: string;
	required?: boolean;
};

function IconField({ label, required, ...props }: IconFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<IconInput
			{...props}
			name={field.name}
			value={field.state.value}
			onChange={(val) => field.handleChange(val)}
			label={label}
			required={required}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default IconField;
