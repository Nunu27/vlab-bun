import type { DeviceTemplateResources } from "@vlab/shared/schemas";
import { withFieldGroup } from "@web/hooks/form/use-app-form";

export const DeviceResourcesForm = withFieldGroup({
	defaultValues: {} as DeviceTemplateResources,
	render: function Render({ group }) {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<group.AppField name="cpu">
					{(field) => (
						<field.NumberField
							label="CPU Limit (cores)"
							min="0.1"
							description="Hard cap enforced on the container."
						/>
					)}
				</group.AppField>

				<group.AppField name="memory">
					{(field) => (
						<field.TextField
							label="Memory Limit"
							placeholder="e.g., 512M, 1G"
							description="Hard cap enforced on the container. Exceeding it kills the node, so leave headroom above real usage."
						/>
					)}
				</group.AppField>
			</div>
		);
	},
});
