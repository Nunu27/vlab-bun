/** biome-ignore-all lint/correctness/useExhaustiveDependencies: avoid excessive rerender */

import { ActionButton } from "@web/components/buttons/action-button";
import { Button } from "@web/components/ui/button";
import { Empty, EmptyDescription } from "@web/components/ui/empty";
import { Field, FieldError } from "@web/components/ui/field";
import { Input } from "@web/components/ui/input";
import { withFieldGroup } from "@web/hooks/form/use-app-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { memo, useEffect } from "react";
import { useEnvFormStore } from "../../stores/env-form-store";

type EnvEntry = { id: string; key: string; value: string };

export const DeviceEnvForm = withFieldGroup({
	defaultValues: {
		env: {} as Record<string, string>,
	},
	render: function Render({ group }) {
		const store = useEnvFormStore();

		const entries = store.use.entries();
		const keyCounts = store.use.keyCounts();
		const { setValue, addEntry } = store.use.actions();
		const errors = new Set<string>();

		useEffect(() => {
			setValue(group.getFieldValue("env"));
		}, []);

		useEffect(() => {
			const { value, emptyIds, keyCounts } = store.getState();
			const hasEmpty = emptyIds.size > 0;
			const hasDuplicate = Object.values(keyCounts).some((count) => count > 1);

			group.setFieldValue("env", value);

			if (hasEmpty || hasDuplicate) {
				const errors: string[] = [];
				if (hasEmpty) errors.push(`empty key(s)`);
				if (hasDuplicate) errors.push("duplicate keys");

				group.setFieldMeta("env", (meta) => ({
					...meta,
					errorMap: { onChange: [{ message: errors.join(" and ") }] },
				}));
			} else {
				group.setFieldMeta("env", (meta) => ({ ...meta, errorMap: {} }));
			}
		}, [entries]);

		return (
			<div className="space-y-4">
				{entries.length > 0 ? (
					<div className="space-y-2">
						{entries.map((entry, index) => {
							const isDuplicate = (keyCounts[entry.key] ?? 0) > 1;
							const isEmpty = entry.key === "";
							const hasError = isDuplicate || isEmpty;

							if (isDuplicate) errors.add(`duplicated key`);
							if (isEmpty) errors.add(`empty key`);

							return (
								<EnvEntryRow
									key={entry.id}
									entry={entry}
									index={index}
									hasError={hasError}
								/>
							);
						})}
					</div>
				) : (
					<Empty className="border border-dashed">
						<EmptyDescription>
							No environment variables defined. Click the button below to add
							one.
						</EmptyDescription>
					</Empty>
				)}

				{!!errors.size && (
					<FieldError
						errors={[{ message: Array.from(errors).join(" and ") }]}
					/>
				)}

				<Button type="button" variant="outline" onClick={addEntry}>
					<PlusIcon /> Add Environment Variable
				</Button>
			</div>
		);
	},
});

const EnvEntryRow = memo<{
	entry: EnvEntry;
	index: number;
	hasError: boolean;
}>(({ entry, index, hasError }) => {
	const store = useEnvFormStore();
	const { updateEntry, removeEntry } = store.use.actions();

	return (
		<div className="grid grid-cols-[1fr_1fr_auto] gap-2">
			<Field>
				<Input
					placeholder="Key"
					value={entry.key}
					onChange={(e) =>
						updateEntry(index, { ...entry, key: e.target.value })
					}
					aria-invalid={hasError}
				/>
			</Field>
			<Field>
				<Input
					placeholder="Value"
					value={entry.value}
					onChange={(e) =>
						updateEntry(index, { ...entry, value: e.target.value })
					}
				/>
			</Field>
			<ActionButton
				variant="destructive"
				onClick={() => removeEntry(index)}
				icon={Trash2Icon}
				tooltip="Delete"
			/>
		</div>
	);
});
