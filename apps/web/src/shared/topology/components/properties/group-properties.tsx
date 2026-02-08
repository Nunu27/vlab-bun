import { FieldGroup } from "@web/components/ui/field";
import { useAppForm } from "@web/hooks/form/use-app-form";
import { useTopologyStore } from "../../stores";

function GroupProperties({ id }: { id: string }) {
	const store = useTopologyStore();
	const { updateGroup } = store.use.actions();
	const group = store.use.groups((groups) => {
		const found = groups[id];
		if (!found) return { name: "", color: "" };
		const { name, color } = found;
		return { name, color };
	});

	const form = useAppForm({
		defaultValues: group,
		onSubmit: ({ value }) => updateGroup(id, value),
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<FieldGroup>
				<form.AppField
					name="name"
					validators={{
						onChange: ({ value }) =>
							value.trim() ? undefined : "Name must be non-empty string",
					}}
				>
					{(field) => (
						<field.TextField label="Name" placeholder="Group Name" required />
					)}
				</form.AppField>
				<form.AppField name="color">
					{(field) => <field.ColorField label="Color" required />}
				</form.AppField>
				<form.AppForm>
					<form.SubmitButton label="Save" />
				</form.AppForm>
			</FieldGroup>
		</form>
	);
}

export default GroupProperties;
