import { useFieldContext } from "@web/hooks/form/use-app-form";
import TextInput from "../input/text-input";

type NumberFieldProps = Omit<
	React.ComponentProps<typeof TextInput>,
	"name" | "value" | "onBlur" | "onChange" | "isInvalid" | "errors"
>;

function NumberField(props: NumberFieldProps) {
	const field = useFieldContext<number | undefined | null>();
	const isInvalid = !field.state.meta.isValid;

	return (
		<TextInput
			{...props}
			type={props.type ?? "number"}
			id={field.name}
			name={field.name}
			value={field.state.value ?? ""}
			onBlur={field.handleBlur}
			onChange={(e) => {
				const val = e.target.valueAsNumber;
				field.handleChange(Number.isNaN(val) ? undefined : val);
			}}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default NumberField;
