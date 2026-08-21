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
							placeholder="defaults to the CPU limit"
							description="CPU reserved on a worker for this device. Leave empty to reserve its CPU limit. Cannot exceed the limit."
						/>
					)}
				</group.AppField>

				<group.AppField name="memoryCostMB">
					{(field) => (
						<field.NumberField
							label="Memory Cost (MB)"
							placeholder="defaults to the memory limit"
							description="RAM reserved on a worker for this device. Leave empty to reserve its memory limit. Cannot exceed the limit."
						/>
					)}
				</group.AppField>
			</div>
		);
	},
});
