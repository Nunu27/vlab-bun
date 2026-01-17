import { Button } from '@frontend/components/ui/button';
import { Field } from '@frontend/components/ui/field';
import { Input } from '@frontend/components/ui/input';
import { withFieldGroup } from '@frontend/hooks/use-app-form';
import { useStore } from '@tanstack/react-form';
import { PlusIcon, Trash2Icon } from 'lucide-react';

export const DeviceEnvForm = withFieldGroup({
  defaultValues: {} as Record<string, string>,
  render: function Render({ group }) {
    const values = useStore(group.store, (state) => state.values);
    const envEntries = Object.entries(values);

    const addEnvVar = () => {
      const newKey = `VAR_${envEntries.length + 1}`;
      group.setFieldValue(newKey, '');
    };

    const updateKey = (oldKey: string, newKey: string) => {
      group.deleteField(oldKey);
      group.setFieldValue(newKey, values[oldKey]);
    };

    const updateValue = (key: string, value: string) => {
      group.setFieldValue(key, value);
    };

    const removeEnvVar = (key: string) => {
      group.deleteField(key);
    };

    return (
      <div className="space-y-4">
        {envEntries.length > 0 ? (
          <div className="space-y-2">
            {envEntries.map(([key, value]) => (
              <div key={key} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Field>
                  <Input
                    placeholder="Key"
                    value={key}
                    onChange={(e) => updateKey(key, e.target.value)}
                  />
                </Field>
                <Field>
                  <Input
                    placeholder="Value"
                    value={value}
                    onChange={(e) => updateValue(key, e.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeEnvVar(key)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground rounded-lg border border-dashed py-4 text-center">
            No environment variables defined. Click the button below to add one.
          </div>
        )}

        <Button type="button" variant="outline" onClick={addEnvVar}>
          <PlusIcon /> Add Environment Variable
        </Button>
      </div>
    );
  },
});
