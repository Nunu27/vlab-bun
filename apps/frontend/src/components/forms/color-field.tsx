import { useFieldContext } from '@frontend/hooks/use-app-form';
import { ColorInput } from '../ui/color-input';
import { Field, FieldError, FieldLabel } from '../ui/field';

type ColorFieldProps = React.ComponentProps<typeof ColorInput> & {
  label: string;
  required?: boolean;
};

function ColorField({ label, required, ...props }: ColorFieldProps) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field>
      <FieldLabel htmlFor={field.name} required={required}>
        {label}
      </FieldLabel>
      <ColorInput
        {...props}
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(value) => field.handleChange(value)}
        aria-invalid={isInvalid}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

export default ColorField;
