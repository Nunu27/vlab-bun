import { type ConnectionType, connectionTypeValues } from "@vlab/shared/enums";
import { withFieldGroup } from "@web/hooks/form/use-app-form";

const connectionTypeOptions = connectionTypeValues.map((type) => ({
	value: type,
	label: type.toUpperCase(),
}));

export const DeviceConnectionForm = withFieldGroup({
	defaultValues: {
		type: "ssh",
		data: {
			port: 22,
		},
	} as {
		type: ConnectionType;
		data: {
			port: number;
			username?: string;
			password?: string;
		};
	},
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
						<field.TextField
							label="Port"
							type="number"
							min="1"
							max="65535"
							required
						/>
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
