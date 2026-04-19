import { FieldGroup } from "@web/components/ui/field";
import { useAppForm } from "@web/hooks/form/use-app-form";
import { useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";

function GroupProperties({ id }: { id: string }) {
	const store = useTopologyStore();
	const { updateGroup } = store.use.actions();
	const group = store.use.groups(
		useShallow((groups) => {
			const found = groups[id];
			if (!found) return { name: "", color: "" };
			const { name, color } = found;
			return { name, color };
		}),
	);

	const form = useAppForm({
		defaultValues: group,
		onSubmit: ({ value }) => updateGroup(id, value),
	});

	useEffect(() => {
		form.reset(group);
	}, [group, form.reset]);

	return (
		<FieldGroup
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					form.handleSubmit();
				}
			}}
		>
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
				<form.SubmitButton
					type="button"
					label="Save"
					onClick={form.handleSubmit}
				/>
			</form.AppForm>
		</FieldGroup>
	);
}

export default GroupProperties;
