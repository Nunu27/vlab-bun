import { Button } from '@frontend/components/ui/button';
import { Field } from '@frontend/components/ui/field';
import { Input } from '@frontend/components/ui/input';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { withForm, type DeviceFormData } from '../hooks/use-device-form';

export const DeviceEnvForm = withForm({
  defaultValues: {} as DeviceFormData,
  render: function Render({ form }) {
    return (
      <form.Field name="env">
        {(field) => {
          const envEntries = Object.entries(
            field.state.value as Record<string, string>,
          );

          const addEnvVar = () => {
            const newKey = `VAR_${Object.keys(field.state.value).length + 1}`;
            field.handleChange({
              ...field.state.value,
              [newKey]: '',
            });
          };

          const updateKey = (oldKey: string, newKey: string) => {
            const newEnv = { ...field.state.value };
            const value = newEnv[oldKey];
            delete newEnv[oldKey];
            newEnv[newKey] = value;
            field.handleChange(newEnv);
          };

          const updateValue = (key: string, value: string) => {
            field.handleChange({
              ...field.state.value,
              [key]: value,
            });
          };

          const removeEnvVar = (key: string) => {
            const newEnv = { ...field.state.value };
            delete newEnv[key];
            field.handleChange(newEnv);
          };

          return (
            <div className="space-y-4">
              {envEntries.length > 0 ? (
                <div className="space-y-2">
                  {envEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="grid grid-cols-[1fr_1fr_auto] gap-2"
                    >
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
                  No environment variables defined. Click the button below to
                  add one.
                </div>
              )}

              <Button type="button" variant="outline" onClick={addEnvVar}>
                <PlusIcon /> Add Environment Variable
              </Button>
            </div>
          );
        }}
      </form.Field>
    );
  },
});
