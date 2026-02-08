import { useFormContext } from "@web/hooks/form/use-app-form";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";

function SubmitButton({ label }: { label: string }) {
	const form = useFormContext();

	return (
		<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
			{([canSubmit, isSubmitting]) => (
				<Button type="submit" disabled={!canSubmit}>
					{isSubmitting && <Spinner />}
					{label}
				</Button>
			)}
		</form.Subscribe>
	);
}

export default SubmitButton;
