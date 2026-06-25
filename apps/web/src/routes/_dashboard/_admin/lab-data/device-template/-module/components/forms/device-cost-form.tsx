import { withFieldGroup } from "@web/hooks/form/use-app-form";

export const DeviceCostForm = withFieldGroup({
	defaultValues: {
		cpuCostCores: undefined as number | null | undefined,
		memoryCostMB: undefined as number | null | undefined,
	},
	render: function Render({ group }) {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<group.AppField name="cpuCostCores">
					{(field) => (
						<field.NumberField
							label="CPU Cost (cores)"
							placeholder="e.g., 1.5"
							description="Estimated CPU cores this device uses at runtime. Run Test Connection to auto-measure."
						/>
					)}
				</group.AppField>

				<group.AppField name="memoryCostMB">
					{(field) => (
						<field.NumberField
							label="Memory Cost (MB)"
							placeholder="e.g., 512"
							description="Estimated RAM in MB this device uses at runtime. Run Test Connection to auto-measure."
						/>
					)}
				</group.AppField>
			</div>
		);
	},
});
