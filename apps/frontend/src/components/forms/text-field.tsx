import { useFieldContext } from '@frontend/hooks/use-app-form';
import { Field, FieldError, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';

type TextFieldProps = React.ComponentProps<'input'> & {
  label: string;
  required?: boolean;
};

function TextField({ label, required, ...props }: TextFieldProps) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field>
      <FieldLabel htmlFor={field.name} required={required}>
        {label}
      </FieldLabel>
      <Input
        {...props}
        id={field.name}
        name={field.name}
        value={field.state.value!}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

export default TextField;
