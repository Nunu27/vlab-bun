import { useFieldContext } from "@web/hooks/form/use-app-form";
import SwitchInput from "../input/switch-input";

type SwitchFieldProps = Omit<
	React.ComponentProps<typeof SwitchInput>,
	"checked" | "onCheckedChange" | "name" | "onBlur" | "isInvalid" | "errors"
>;

function SwitchField(props: SwitchFieldProps) {
	const field = useFieldContext<boolean>();
	const isInvalid = !field.state.meta.isValid;

	return (
		<SwitchInput
			{...props}
			name={field.name}
			checked={field.state.value}
			onCheckedChange={(checked) => field.handleChange(checked)}
			onBlur={field.handleBlur}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default SwitchField;
