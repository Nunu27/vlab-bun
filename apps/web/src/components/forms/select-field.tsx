import { useFieldContext } from "@web/hooks/form/use-app-form";
import SelectInput from "../input/select-input";

type SelectFieldProps = Omit<
	React.ComponentProps<typeof SelectInput>,
	"name" | "value" | "onValueChange" | "isInvalid" | "errors"
>;

function SelectField(props: SelectFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = !field.state.meta.isValid;

	return (
		<SelectInput
			{...props}
			name={field.name}
			value={(field.state.value as string) ?? ""}
			onValueChange={(val) => field.handleChange(val)}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default SelectField;
