import { useFieldContext } from '@frontend/hooks/use-app-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@frontend/components/ui/select';
import { Field, FieldError, FieldLabel } from '../ui/field';

type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  label: string;
  required?: boolean;
  placeholder?: string;
  options: SelectOption[] | readonly string[];
};

function SelectField({
  label,
  required,
  placeholder = 'Select an option',
  options,
}: SelectFieldProps) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt,
  );

  return (
    <Field>
      <FieldLabel htmlFor={field.name} required={required}>
        {label}
      </FieldLabel>
      <Select
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
      >
        <SelectTrigger
          id={field.name}
          aria-invalid={isInvalid}
          onBlur={field.handleBlur}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {normalizedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

export default SelectField;
