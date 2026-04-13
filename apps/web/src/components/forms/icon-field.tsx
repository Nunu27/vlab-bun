import { useFieldContext } from "@web/hooks/form/use-app-form";
import IconInput from "../input/icon-input";

type IconFieldProps = Omit<
	React.ComponentProps<typeof IconInput>,
	"name" | "value" | "onChange" | "isInvalid" | "errors"
>;

function IconField(props: IconFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = !field.state.meta.isValid;

	return (
		<IconInput
			{...props}
			name={field.name}
			value={field.state.value}
			onChange={(val) => field.handleChange(val)}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default IconField;
