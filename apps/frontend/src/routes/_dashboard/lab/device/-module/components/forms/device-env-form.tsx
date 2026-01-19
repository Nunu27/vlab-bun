/* eslint-disable react-hooks/exhaustive-deps */
import { Button } from '@frontend/components/ui/button';
import { Field, FieldError } from '@frontend/components/ui/field';
import { Input } from '@frontend/components/ui/input';
import { withFieldGroup } from '@frontend/hooks/use-app-form';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { memo, useEffect } from 'react';
import { useEnvFormStore } from '../../stores/env-form-store';
import { ActionButton } from '@frontend/components/action-button';

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
      setValue(group.getFieldValue('env'));
    }, []);

    useEffect(() => {
      const { value, emptyIds, keyCounts } = store.getState();
      const hasEmpty = emptyIds.size > 0;
      const hasDuplicate = Array.from(keyCounts.values()).some(
        (count) => count > 1,
      );

      group.setFieldValue('env', value);

      if (hasEmpty || hasDuplicate) {
        const errors: string[] = [];
        if (hasEmpty) errors.push(`empty key(s)`);
        if (hasDuplicate) errors.push('duplicate keys');

        group.setFieldMeta('env', (meta) => ({
          ...meta,
          errorMap: { onChange: [{ message: errors.join(' and ') }] },
        }));
      } else {
        group.setFieldMeta('env', (meta) => ({ ...meta, errorMap: {} }));
      }
    }, [entries]);

    return (
      <div className="space-y-4">
        {entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map((entry, index) => {
              const isDuplicate = (keyCounts.get(entry.key) ?? 0) > 1;
              const isEmpty = entry.key === '';
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
          <div className="text-muted-foreground rounded-lg border border-dashed py-4 text-center">
            No environment variables defined. Click the button below to add one.
          </div>
        )}

        {!!errors.size && (
          <FieldError
            errors={[{ message: Array.from(errors).join(' and ') }]}
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
