import { FieldGroup } from "@web/components/ui/field";
import { useAppForm } from "@web/hooks/form/use-app-form";
import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";

function DeviceProperties({ id }: { id: string }) {
	const store = useTopologyStore();
	const { updateDevice } = store.use.actions();
	const device = store.use.devices(
		useShallow((devices) => {
			const found = devices[id];
			if (!found) return { name: "", resources: {} };
			const { name, resources } = found;
			return { name, resources };
		}),
	);

	const form = useAppForm({
		defaultValues: device,
		onSubmit: ({ value }) => updateDevice(id, value),
	});

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
						value.trim()
							? undefined
							: { message: "Name must be non-empty string" },
					onBlur: ({ value }) => {
						const { deviceNames } = store.getState();

						if (value === device.name || !deviceNames.has(value)) return;
						return { message: "Name must be unique" };
					},
				}}
			>
				{(field) => (
					<field.TextField label="Name" placeholder="Device Name" required />
				)}
			</form.AppField>
			<div className="grid grid-cols-2 gap-4">
				<form.AppField name="resources.cpu">
					{(field) => (
						<field.TextField label="CPU Cores" type="number" min="1" />
					)}
				</form.AppField>

				<form.AppField name="resources.memory">
					{(field) => (
						<field.TextField label="Memory" placeholder="e.g., 512M, 1G" />
					)}
				</form.AppField>
			</div>
			<form.AppForm>
				<form.SubmitButton label="Save" />
			</form.AppForm>
		</FieldGroup>
	);
}

export default DeviceProperties;
