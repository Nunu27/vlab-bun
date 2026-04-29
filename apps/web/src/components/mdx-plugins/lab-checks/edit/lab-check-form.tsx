import { useStore } from "@tanstack/react-form";
import type { LabCheckConfig } from "@vlab/shared/schemas";
import { AutoForm } from "@web/components/forms/auto-form";
import { Button } from "@web/components/ui/button";
import { withFieldGroup } from "@web/hooks/form/use-app-form";
import { TrashIcon } from "lucide-react";
import { useMemo } from "react";
import { useLabChecksEditorStore } from "../stores/lab-checks-editor-store";

export const LabCheckForm = withFieldGroup({
	defaultValues: {} as LabCheckConfig,
	props: {
		onRemove: () => {},
	},
	render: function CheckItemRender({ group, onRemove }) {
		const store = useLabChecksEditorStore();
		const nodes = store.use.nodes();
		const kindMapping = store.use.kindMapping();
		const evaluator = store.use.evaluator();

		const selectedNodeId = useStore(group.store, (s) => s.values?.nodeId);
		const selectedCheckId = useStore(group.store, (s) => s.values?.checkId);

		const kind = kindMapping[selectedNodeId];

		const checkOptions = useMemo(() => {
			if (!kind) return [];

			const options: { label: string; value: string }[] = [];

			Object.entries(evaluator.handlers).forEach(([sysName, sys]) => {
				if (!sys.kinds.length || sys.kinds.includes(kind)) {
					for (const checkId of sys.checks) {
						const id = `${sysName}.${checkId}`;
						options.push({
							label: evaluator.checks[id].name,
							value: id,
						});
					}
				}
			});

			return options;
		}, [kind, evaluator]);

		const selectedSchema = selectedCheckId
			? evaluator.checks[selectedCheckId]?.params
			: null;

		return (
			<div className="relative m-2 rounded-md border bg-muted/30 p-2 text-sm">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="absolute top-1 right-1 size-6 text-muted-foreground hover:text-destructive"
					onClick={onRemove}
				>
					<TrashIcon className="size-3" />
				</Button>
				<div className="space-y-2">
					<div className="grid grid-cols-[2fr_2fr_80px] gap-2">
						<group.AppField name="nodeId">
							{(nodeField) => (
								<nodeField.ComboboxField
									label="Node"
									placeholder="Select device..."
									options={nodes}
									required
								/>
							)}
						</group.AppField>
						<group.AppField name="checkId">
							{(checkField) => (
								<checkField.ComboboxField
									label="Check"
									placeholder="Select check..."
									options={checkOptions}
									required
									disabled={!selectedNodeId}
								/>
							)}
						</group.AppField>
						<group.AppField name="weight">
							{(weightField) => (
								<weightField.NumberField label="Weight" required />
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
			</div>
		);
	},
});
