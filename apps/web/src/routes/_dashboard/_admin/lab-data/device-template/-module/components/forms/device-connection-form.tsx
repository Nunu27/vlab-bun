import { connectionTypeValues } from "@vlab/shared/enums";
import type { DeviceTemplateConnection } from "@vlab/shared/schemas/device-template";
import { withFieldGroup } from "@web/hooks/form/use-app-form";

const connectionTypeOptions = connectionTypeValues.map((type) => ({
	value: type,
	label: type.toUpperCase(),
}));

export const DeviceConnectionForm = withFieldGroup({
	defaultValues: {} as DeviceTemplateConnection,
	render: function Render({ group }) {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<group.AppField name="type">
					{(field) => (
						<field.SelectField
							label="Connection Type"
							placeholder="Select connection type"
							options={connectionTypeOptions}
							required
						/>
					)}
				</group.AppField>

				<group.AppField name="data.port">
					{(field) => (
						<field.NumberField label="Port" min="1" max="65535" required />
					)}
				</group.AppField>

				<group.AppField name="data.username">
					{(field) => (
						<field.TextField label="Username" placeholder="e.g., admin" />
					)}
				</group.AppField>

				<group.AppField name="data.password">
					{(field) => (
						<field.TextField
							label="Password"
							placeholder="Enter password"
							type="password"
						/>
					)}
				</group.AppField>
			</div>
		);
	},
});
