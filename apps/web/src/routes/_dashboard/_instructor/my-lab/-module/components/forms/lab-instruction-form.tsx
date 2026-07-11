import { Value } from "@sinclair/typebox/value";
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

			categorizedTemplates.forEach((category) => {
				category.templates.forEach((template) => {
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
						<group.AppField
							name="checks"
							validators={{
								onChange: ({ value }) => {
									if (!value) return undefined;

									for (const check of Object.values(value)) {
										if (!check.nodeId)
											return `Check configuration is missing a Node ID.`;
										if (!check.checkId)
											return `Check configuration is missing a Check ID.`;

										const checkConfig = evaluatorData.checks[check.checkId];
										if (checkConfig?.params) {
											const isValid = Value.Check(
												checkConfig.params,
												check.params,
											);
											if (!isValid) {
												const errors = [
													...Value.Errors(checkConfig.params, check.params),
												];
												if (errors.length > 0) {
													const error = errors[0];
													const fieldName = error.path.replace(/^\//, "");
													return `Check "${checkConfig.name}" has an invalid or missing value for field "${fieldName}".`;
												}
												return `Check "${checkConfig.name}" is missing mandatory fields.`;
											}
										}
									}
									return undefined;
								},
							}}
						>
							{(field) =>
								field.state.meta.errors.length > 0 ? (
									<div className="border-destructive/20 border-b bg-destructive/10 px-4 py-2 font-medium text-destructive text-sm">
										{field.state.meta.errors.join(", ")}
									</div>
								) : null
							}
						</group.AppField>

						<div data-tour="lab-instructions-editor">
							<group.AppField name="content">
								{(field) => (
									<field.MarkdownField
										className="rounded-none border-none"
										checks
									/>
								)}
							</group.AppField>
						</div>

						<LabCheckModal />
					</group.AppForm>
				</LabChecksModalProvider>
			</LabChecksEditorProvider>
		);
	},
});
