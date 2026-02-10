import { withFieldGroup } from "@web/hooks/form/use-app-form";

export const DeviceResourcesForm = withFieldGroup({
	defaultValues: {} as {
		cpu?: number;
		memory?: string;
	},
	render: function Render({ group }) {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<group.AppField name="cpu">
					{(field) => (
						<field.TextField label="CPU Cores" type="number" min="1" />
					)}
				</group.AppField>

				<group.AppField name="memory">
					{(field) => (
						<field.TextField label="Memory" placeholder="e.g., 512M, 1G" />
					)}
				</group.AppField>
			</div>
		);
	},
});
