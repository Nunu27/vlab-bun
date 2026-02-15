import { useFieldContext } from "@web/hooks/form/use-app-form";
import type { PaginationEndpoint } from "@web/types";
import PaginatedComboboxInput from "../input/paginated-combobox-input";

type PaginatedComboboxFieldProps<TEndpoint extends PaginationEndpoint> = Omit<
	React.ComponentProps<typeof PaginatedComboboxInput<TEndpoint>>,
	"value" | "onChange" | "name"
> & {
	label: string;
	required?: boolean;
};

function PaginatedComboboxField<TEndpoint extends PaginationEndpoint>(
	props: PaginatedComboboxFieldProps<TEndpoint>,
) {
	const field = useFieldContext<string>();
	const isInvalid = !field.state.meta.isValid;

	return (
		<PaginatedComboboxInput
			{...props}
			name={field.name}
			value={field.state.value}
			onChange={(val) => field.handleChange(val)}
			isInvalid={isInvalid}
			errors={field.state.meta.errors}
		/>
	);
}

export default PaginatedComboboxField;
