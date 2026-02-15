import { useFieldContext } from "@web/hooks/form/use-app-form";
import MarkdownInput from "../input/markdown-input";

type MarkdownFieldProps = Omit<
	React.ComponentProps<typeof MarkdownInput>,
	"value" | "onChange" | "name" | "onBlur"
> & {
	label?: string;
	required?: boolean;
};

function MarkdownField(props: MarkdownFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = !field.state.meta.isValid;

	return (
		<MarkdownInput
			{...props}
			name={field.name}
			value={field.state.value}
			onBlur={field.handleBlur}
			onChange={field.handleChange}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default MarkdownField;
