import { Field, FieldError, FieldLabel } from '@frontend/components/ui/field';
import { Input } from '@frontend/components/ui/input';
import { withForm, type DeviceFormData } from '../hooks/use-device-form';

export const DeviceResourcesForm = withForm({
  defaultValues: {} as DeviceFormData,
  render: function Render({ form }) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <form.Field name="resources.cpu">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field>
                <FieldLabel htmlFor={field.name}>CPU Cores</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min="1"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="resources.memory">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field>
                <FieldLabel htmlFor={field.name}>Memory</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="e.g., 512M, 1G"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
      </div>
    );
  },
});
