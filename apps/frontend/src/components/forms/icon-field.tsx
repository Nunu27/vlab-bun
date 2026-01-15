import { useFieldContext } from '@frontend/hooks/use-app-form';
import { Field, FieldError, FieldLabel } from '../ui/field';
import { IconPicker } from '../ui/icon-picker';

type IconFieldProps = {
  label: string;
  placeholder?: string;
  required?: boolean;
};

function IconField({ label, placeholder, required }: IconFieldProps) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field>
      <FieldLabel htmlFor={field.name} required={required}>
        {label}
      </FieldLabel>
      <IconPicker
        value={field.state.value}
        onChange={(value) => field.handleChange(value)}
        placeholder={placeholder}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

export default IconField;
