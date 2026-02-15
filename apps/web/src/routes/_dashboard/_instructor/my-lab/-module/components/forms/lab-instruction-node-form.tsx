import type { DeviceKind } from "@vlab/shared/enums";
import type { LabInstruction } from "@vlab/shared/schemas";
import { ActionButton } from "@web/components/buttons/action-button";
import { Button } from "@web/components/ui/button";
import { Empty, EmptyDescription } from "@web/components/ui/empty";
import { withFieldGroup } from "@web/hooks/form/use-app-form";
import { cn } from "@web/lib/utils";
import {
	ChevronDownIcon,
	ChevronRightIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { LabCheckItem } from "./lab-check-item";

export const LabInstructionNodeForm = withFieldGroup({
	defaultValues: {} as LabInstruction,
	props: {
		nodes: [] as { id: string; name: string; kind: DeviceKind }[],
		onRemove: () => {},
		indexPrefix: "",
	},
	render: function Render({ group, nodes, onRemove, indexPrefix }) {
		const [expanded, setExpanded] = useState(true);

		return (
			<div className="rounded-lg border bg-card">
				{/* Node header */}
				<div className="flex items-start gap-2 px-3 py-2">
					<button
						type="button"
						className="mt-2 flex min-w-12 shrink-0 cursor-pointer items-center gap-2 text-muted-foreground"
						onClick={() => setExpanded((v) => !v)}
					>
						{expanded ? (
							<ChevronDownIcon className="size-4" />
						) : (
							<ChevronRightIcon className="size-4" />
						)}
						{indexPrefix}
					</button>
					<group.AppField name="text">
						{(field) =>
							expanded ? (
								<div className="flex-1">
									<field.TextareaField
										placeholder="Describe the step..."
										className="min-h-10 w-full text-sm"
										rows={1}
									/>
								</div>
							) : (
								<button
									type="button"
									className="mt-2 flex-1 cursor-pointer text-left"
									onClick={() => setExpanded(true)}
								>
									<span
										className={cn(
											"whitespace-pre-wrap text-muted-foreground text-sm",
											!field.state.value && "text-muted-foreground/50 italic",
										)}
									>
										{field.state.value || "Empty instruction..."}
									</span>
								</button>
							)
						}
					</group.AppField>
					<ActionButton
						type="button"
						icon={Trash2Icon}
						tooltip="Remove"
						variant="destructive"
						onClick={onRemove}
					/>
				</div>

				{expanded && (
					<div className="space-y-4 border-t px-3 pt-3 pb-3">
						{/* Evaluation Checks */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="font-medium text-sm">Evaluation Checks</span>
								<group.AppField name="checks" mode="array">
									{(checksField) => (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												checksField.pushValue({
													id: crypto.randomUUID(),
													nodeId: "",
													checkId: "",
													params: {},
													weight: 1,
												})
											}
										>
											<PlusIcon /> Add Check
										</Button>
									)}
								</group.AppField>
							</div>

							<group.AppField name="checks" mode="array">
								{(checksField) => {
									const checks = checksField.state.value || [];

									if (checks.length === 0) {
										return (
											<Empty className="p-4">
												<EmptyDescription>No checks defined.</EmptyDescription>
											</Empty>
										);
									}

									return (
										<div className="space-y-2">
											{checks.map((check, idx) => (
												<LabCheckItem
													key={check.id || idx}
													form={group}
													fields={`checks[${idx}]`}
													idx={idx}
													nodes={nodes}
													onRemove={() => checksField.removeValue(idx)}
												/>
											))}
										</div>
									);
								}}
							</group.AppField>
						</div>

						{/* Nested Sub-steps */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="font-medium text-sm">Sub-steps</span>
								<group.AppField name="children" mode="array">
									{(childrenField) => (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												childrenField.pushValue({
													id: crypto.randomUUID(),
													text: "",
													checks: [],
													children: [],
												})
											}
										>
											<PlusIcon /> Add Sub-step
										</Button>
									)}
								</group.AppField>
							</div>

							<group.AppField name="children" mode="array">
								{(childrenField) => {
									const children = childrenField.state.value || [];

									if (children.length === 0) {
										return (
											<Empty className="p-4">
												<EmptyDescription>
													No sub-steps defined.
												</EmptyDescription>
											</Empty>
										);
									}

									return (
										<div className="space-y-2">
											{(children as LabInstruction[]).map((child, idx) => (
												<LabInstructionNodeForm
													key={child.id || idx}
													nodes={nodes}
													onRemove={() => childrenField.removeValue(idx)}
													form={group}
													fields={`children[${idx}]` as never}
													indexPrefix={`${indexPrefix}.${idx + 1}`}
												/>
											))}
										</div>
									);
								}}
							</group.AppField>
						</div>
					</div>
				)}
			</div>
		);
	},
});
