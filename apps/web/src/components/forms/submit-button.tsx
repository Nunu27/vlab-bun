import { useFormContext } from "@web/hooks/form/use-app-form";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";

function SubmitButton({
	label,
	...props
}: { label: string } & React.ComponentProps<"button">) {
	const form = useFormContext();

	return (
		<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
			{([canSubmit, isSubmitting]) => (
				<Button type="submit" disabled={!canSubmit} {...props}>
					{isSubmitting && <Spinner />}
					{label}
				</Button>
			)}
		</form.Subscribe>
	);
}

export default SubmitButton;
