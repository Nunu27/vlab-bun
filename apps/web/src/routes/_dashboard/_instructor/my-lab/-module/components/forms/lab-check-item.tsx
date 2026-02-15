import { useStore } from "@tanstack/react-form";
import type { DeviceKind } from "@vlab/shared/enums";
import type { LabCheckConfig } from "@vlab/shared/schemas/lab";
import { AutoForm } from "@web/components/forms/auto-form";
import { Button } from "@web/components/ui/button";
import { withFieldGroup } from "@web/hooks/form/use-app-form";
import api from "@web/lib/api";
import { ChevronDownIcon, ChevronRightIcon, TrashIcon } from "lucide-react";
import { useState } from "react";

export const LabCheckItem = withFieldGroup({
	defaultValues: {} as LabCheckConfig,
	props: {
		idx: 0,
		nodes: [] as { id: string; name: string; kind: DeviceKind }[],
		onRemove: () => {},
	},
	render: function CheckItemRender({ group, idx, nodes, onRemove }) {
		const [expanded, setExpanded] = useState(true);
		const { data: evaluatorData } = api.evaluator.list.get.useSuspenseQuery();

		const selectedNodeId = useStore(group.store, (s) => s.values.nodeId);
		const selectedCheckId = useStore(group.store, (s) => s.values.checkId);

		const selectedNode = nodes.find((n) => n.id === selectedNodeId);
		const checks: { id: string; name: string }[] = [];

		if (selectedNode) {
			for (const [sysName, sys] of Object.entries(evaluatorData.handlers)) {
				if (!sys.kinds.length || sys.kinds.includes(selectedNode.kind)) {
					for (const checkId of sys.checks) {
						const id = `${sysName}.${checkId}`;

						checks.push({
							id,
							name: evaluatorData.checks[id].name || id,
						});
					}
				}
			}
		}

		const selectedNodeLabel = selectedNode?.name ?? selectedNodeId;
		const selectedCheckLabel =
			checks.find((c) => c.id === selectedCheckId)?.name ?? selectedCheckId;

		const selectedSchema = selectedCheckId
			? evaluatorData.checks[selectedCheckId].params
			: null;

		return (
			<div className="rounded-md border bg-muted/30 text-sm">
				<div className="flex items-center gap-1 p-1 pl-2">
					<button
						type="button"
						className="flex flex-1 cursor-pointer items-center gap-1 text-muted-foreground text-xs"
						onClick={() => setExpanded((v) => !v)}
					>
						{expanded ? (
							<ChevronDownIcon className="size-3 shrink-0" />
						) : (
							<ChevronRightIcon className="size-3 shrink-0" />
						)}
						<span>
							Check {idx + 1}
							{!expanded && selectedNodeLabel ? ` — ${selectedNodeLabel}` : ""}
							{!expanded && selectedCheckLabel ? `: ${selectedCheckLabel}` : ""}
						</span>
					</button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="size-6 p-0 text-muted-foreground hover:text-destructive"
						onClick={onRemove}
					>
						<TrashIcon className="size-3" />
					</Button>
				</div>
				{expanded && (
					<div className="space-y-2 px-2 pb-2">
						<div className="grid grid-cols-[2fr_2fr_80px] gap-2">
							<group.AppField name="nodeId">
								{(nodeField) => (
									<nodeField.SelectField
										label="Node"
										placeholder="Select device..."
										options={nodes.map((n) => ({ label: n.name, value: n.id }))}
										required
									/>
								)}
							</group.AppField>
							<group.AppField name="checkId">
								{(checkField) => (
									<checkField.SelectField
										label="Check"
										placeholder="Select check..."
										options={checks.map((c) => ({
											label: c.name,
											value: c.id,
										}))}
										required
										disabled={!selectedNodeId}
									/>
								)}
							</group.AppField>
							<group.AppField name="weight">
								{(weightField) => (
									<weightField.TextField
										label="Weight"
										type="number"
										onChange={(val) => weightField.handleChange(Number(val))}
										required
									/>
								)}
							</group.AppField>
						</div>
						{selectedSchema && (
							<AutoForm
								form={group}
								fields="params"
								schema={selectedSchema}
								className="flex-row gap-2"
							/>
						)}
					</div>
				)}
			</div>
		);
	},
});
