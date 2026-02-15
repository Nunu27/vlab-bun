import type { DeviceKind } from "@vlab/shared/enums";
import type { LabInstruction } from "@vlab/shared/schemas";
import { Button } from "@web/components/ui/button";
import { Empty, EmptyDescription } from "@web/components/ui/empty";
import { withFieldGroup } from "@web/hooks/form/use-app-form";
import api from "@web/lib/api";
import { useTopologyStore } from "@web/shared/topology/stores";
import { PlusIcon } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { LabInstructionNodeForm } from "./lab-instruction-node-form";

export const LabInstructionForm = withFieldGroup({
	defaultValues: {
		instructions: [] as LabInstruction[],
	},
	render: function Render({ group }) {
		const store = useTopologyStore();
		const { data: categories } =
			api["device-template"].list.get.useSuspenseQuery();
		const deviceIds = store.use.devices(
			useShallow((devices) => {
				return Object.keys(devices).sort();
			}),
		);

		const nodes = useMemo(() => {
			const { devices } = store.getState();
			const kindMap = new Map<string, DeviceKind>();

			for (const category of categories) {
				for (const template of category.templates) {
					kindMap.set(template.id, template.kind);
				}
			}

			return deviceIds.map((id) => {
				// biome-ignore lint/style/noNonNullAssertion: should always exist
				const device = devices[id]!;

				return {
					id,
					name: device.name,
					kind: kindMap.get(device.deviceId) || "linux",
				};
			});
		}, [categories, deviceIds, store]);

		return (
			<div className="space-y-4">
				<group.AppField name="instructions" mode="array">
					{(instructionsField) => {
						const instructions = instructionsField.state.value || [];

						const addInstruction = () => {
							instructionsField.pushValue({
								id: crypto.randomUUID(),
								text: "",
								checks: [],
								children: [],
							});
						};

						const removeInstruction = (index: number) => {
							instructionsField.removeValue(index);
						};

						return (
							<div className="space-y-4">
								{instructions.length > 0 ? (
									<div className="space-y-2">
										{instructions.map((instruction, index) => (
											<LabInstructionNodeForm
												key={instruction.id || index}
												nodes={nodes}
												onRemove={() => removeInstruction(index)}
												form={group}
												fields={`instructions[${index}]` as never}
												indexPrefix={`${index + 1}`}
											/>
										))}
									</div>
								) : (
									<Empty className="border border-dashed">
										<EmptyDescription>
											No instructions yet. Click the button below to add one.
										</EmptyDescription>
									</Empty>
								)}

								<Button
									type="button"
									variant="outline"
									onClick={addInstruction}
								>
									<PlusIcon />
									Add Instruction
								</Button>
							</div>
						);
					}}
				</group.AppField>
			</div>
		);
	},
});
