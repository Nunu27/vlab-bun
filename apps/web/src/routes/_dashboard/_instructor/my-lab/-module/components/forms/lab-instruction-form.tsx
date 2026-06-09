import type { DeviceKind } from "@vlab/shared/enums";
import type { LabChecksMap, LabDeviceNode } from "@vlab/shared/schemas";
import { LabChecksEditorProvider } from "@web/components/mdx-plugins/lab-checks";
import LabCheckModal from "@web/components/mdx-plugins/lab-checks/edit/lab-check-modal";
import { LabChecksModalProvider } from "@web/components/mdx-plugins/lab-checks/stores/lab-checks-modal-store";
import { withFieldGroup } from "@web/hooks/form/use-app-form";
import api from "@web/lib/api";
import { useMemo } from "react";

export const LabInstructionForm = withFieldGroup({
	defaultValues: null as unknown as {
		devices: Record<string, LabDeviceNode>;
		content: string;
		checks: LabChecksMap;
	},
	render: ({ group }) => {
		const { data: categorizedTemplates } =
			api["device-template"].list.get.useSuspenseQuery();
		const { data: evaluatorData } = api.evaluator.list.get.useSuspenseQuery();

		const kindMap = useMemo(() => {
			const map: Record<string, DeviceKind> = {};

			categorizedTemplates.forEach((category: any) => {
				category.templates.forEach((template: any) => {
					map[template.id] = template.kind;
				});
			});

			return map;
		}, [categorizedTemplates]);

		const nodes: { label: string; value: string }[] = [];
		const kindMapping: Record<string, DeviceKind> = {};

		Object.entries(group.state.values.devices ?? {}).forEach(([id, device]) => {
			nodes.push({ label: device.name, value: id });
			kindMapping[id] = kindMap[device.deviceId] || ("linux" as DeviceKind);
		});

		return (
			<LabChecksEditorProvider
				nodes={nodes}
				kindMapping={kindMapping}
				evaluator={evaluatorData}
			>
				<LabChecksModalProvider>
					<group.AppForm>
						<group.AppField name="content">
							{(field) => (
								<field.MarkdownField
									className="rounded-none border-none"
									checks
								/>
							)}
						</group.AppField>

						<LabCheckModal />
					</group.AppForm>
				</LabChecksModalProvider>
			</LabChecksEditorProvider>
		);
	},
});
