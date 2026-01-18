/* eslint-disable react-hooks/exhaustive-deps */
import { Button } from '@frontend/components/ui/button';
import { Field, FieldError } from '@frontend/components/ui/field';
import { Input } from '@frontend/components/ui/input';
import { withFieldGroup } from '@frontend/hooks/use-app-form';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { memo, useEffect } from 'react';
import { useEnvFormStore } from '../../stores/env-form-store';

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
      <group.Field name="env">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <div className="space-y-4">
              {entries.length > 0 ? (
                <div className="space-y-2">
                  {entries.map((entry, index) => {
                    const isDuplicate = (keyCounts.get(entry.key) ?? 0) > 1;
                    const isEmpty = entry.key === '';
                    const hasError = isDuplicate || isEmpty;

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
                  No environment variables defined. Click the button below to
                  add one.
                </div>
              )}

              {isInvalid && <FieldError errors={field.state.meta.errors} />}

              <Button type="button" variant="outline" onClick={addEntry}>
                <PlusIcon /> Add Environment Variable
              </Button>
            </div>
          );
        }}
      </group.Field>
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
      <Button
        type="button"
        variant="destructive"
        size="icon"
        onClick={() => removeEntry(index)}
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  );
});
