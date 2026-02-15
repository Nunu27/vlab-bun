import { useFieldContext } from "@web/hooks/form/use-app-form";
import ImageInput from "../input/image-input";

type ImageFieldProps = {
	label?: string;
	required?: boolean;
};

function ImageField(props: ImageFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = !field.state.meta.isValid;

	return (
		<ImageInput
			{...props}
			name={field.name}
			value={field.state.value}
			onChange={field.handleChange}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default ImageField;
