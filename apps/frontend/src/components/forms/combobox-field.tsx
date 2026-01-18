import { ComboBox } from '@frontend/components/ui/combobox';
import { Field, FieldError, FieldLabel } from '@frontend/components/ui/field';
import { useFieldContext } from '@frontend/hooks/use-app-form';

type Option = {
  value: string;
  label: string;
};

type ComboBoxFieldProps = {
  label: string;
  required?: boolean;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  width?: string;
  allowClear?: boolean;
};

function ComboBoxField({
  label,
  required,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  width = 'w-full',
  allowClear,
}: ComboBoxFieldProps) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field>
      <FieldLabel htmlFor={field.name} required={required}>
        {label}
      </FieldLabel>
      <ComboBox
        options={options}
        value={field.state.value}
        onChange={(value) => field.handleChange(value ?? '')}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        width={width}
        allowClear={allowClear}
        isInvalid={isInvalid}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

export default ComboBoxField;
