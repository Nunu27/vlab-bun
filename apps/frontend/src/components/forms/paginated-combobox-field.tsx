import { useFieldContext } from '@frontend/hooks/use-app-form';
import type {
  ExtractPaginationDataFromEndpoint,
  ExtractQueryParams,
} from '@frontend/types/api';
import { PaginatedComboBox } from '../ui/combobox';
import { Field, FieldError, FieldLabel } from '../ui/field';

type Option = {
  value: string;
  label: string;
};

type PaginatedComboBoxFieldProps<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TEndpoint extends { useInfiniteQuery: (...args: any) => any },
> = {
  label: string;
  required?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  width?: string;
  allowClear?: boolean;
  endpoint: TEndpoint;
  params?: Omit<ExtractQueryParams<TEndpoint>, 'page' | 'search'>;
  renderOption: (item: ExtractPaginationDataFromEndpoint<TEndpoint>) => Option;
  defaultOptions?: Option[];
};

function PaginatedComboBoxField<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TEndpoint extends { useInfiniteQuery: (...args: any) => any },
>({
  label,
  required,
  endpoint,
  params,
  renderOption,
  defaultOptions,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  width,
  allowClear,
}: PaginatedComboBoxFieldProps<TEndpoint>) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field>
      <FieldLabel htmlFor={field.name} required={required}>
        {label}
      </FieldLabel>
      <PaginatedComboBox<
        ExtractPaginationDataFromEndpoint<TEndpoint>,
        ExtractQueryParams<TEndpoint>
      >
        value={field.state.value}
        onChange={(value) => field.handleChange(value ?? '')}
        endpoint={endpoint}
        params={params}
        renderOption={renderOption}
        defaultOptions={defaultOptions}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        width={width}
        allowClear={allowClear}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

export default PaginatedComboBoxField;
