import { type DeviceKind, deviceKindValues } from "@vlab/shared/enums";
import { withFieldGroup } from "@web/hooks/form/use-app-form";
import api from "@web/lib/api";

const deviceKindOptions = deviceKindValues.map((kind) => ({
	value: kind,
	label: kind,
}));

export const DeviceBasicInfoForm = withFieldGroup({
	defaultValues: {
		name: "",
		kind: "linux" as DeviceKind,
		image: "",
		icon: "",
		deviceCategoryId: "",
	},
	render: function Render({ group }) {
		return (
			<div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
				<div>
					<group.AppField name="icon">
						{(field) => (
							<field.IconField
								label="Device Icon"
								placeholder="Select icon..."
								required
							/>
						)}
					</group.AppField>
				</div>

				<div className="space-y-4">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<group.AppField name="name">
							{(field) => (
								<field.TextField
									label="Device Name"
									placeholder="e.g., Cisco Router 1"
									required
								/>
							)}
						</group.AppField>

						<group.AppField name="image">
							{(field) => (
								<field.TextField
									label="Docker Image"
									placeholder="e.g., cisco/ios:latest"
									required
								/>
							)}
						</group.AppField>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<group.AppField name="kind">
							{(field) => (
								<field.ComboboxField
									label="Device Kind"
									options={deviceKindOptions}
									placeholder="Select device kind"
									emptyText="No device kind found."
									required
								/>
							)}
						</group.AppField>
						<group.AppField name="deviceCategoryId">
							{(field) => (
								<field.PaginatedComboboxField
									label="Category"
									placeholder="Select category..."
									endpoint={api["device-category"].pagination}
									getLabel={(d) => d.name}
									getValue={(d) => d.id}
									emptyText="No category found."
									required
								/>
							)}
						</group.AppField>
					</div>
				</div>
			</div>
		);
	},
});
