import { Field, FieldError, FieldLabel } from '@frontend/components/ui/field';
import { Input } from '@frontend/components/ui/input';

interface DeviceResourcesFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
}

export function DeviceResourcesForm({ form }: DeviceResourcesFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <form.Field name="resources.cpu">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(field: any) => {
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
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(field: any) => {
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
}
