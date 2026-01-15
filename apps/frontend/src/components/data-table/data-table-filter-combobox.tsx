import { PaginatedComboBox } from '@frontend/components/ui/combobox';
import type {
  ExtractPaginationDataFromEndpoint,
  ExtractQueryParams,
} from '@frontend/types/api';

export type FilterComboboxProps<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TEndpoint extends { useInfiniteQuery: (...args: any) => any },
> = {
  label: string;
  endpoint: TEndpoint;
  params?: Omit<ExtractQueryParams<TEndpoint>, 'page' | 'search'>;
  getItemValue: (item: ExtractPaginationDataFromEndpoint<TEndpoint>) => string;
  getItemLabel: (item: ExtractPaginationDataFromEndpoint<TEndpoint>) => string;
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  width?: string;
};

export function DataTableFilterCombobox<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TEndpoint extends { useInfiniteQuery: (...args: any) => any },
>({
  label,
  endpoint,
  params,
  getItemValue,
  getItemLabel,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  disabled = false,
  width = 'w-[200px]',
}: FilterComboboxProps<TEndpoint>) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{label}:</span>
      <PaginatedComboBox<
        ExtractPaginationDataFromEndpoint<TEndpoint>,
        ExtractQueryParams<TEndpoint>
      >
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        disabled={disabled}
        width={width}
        allowClear={true}
        endpoint={endpoint}
        params={params}
        renderOption={(item) => ({
          value: getItemValue(item),
          label: getItemLabel(item),
        })}
      />
    </div>
  );
}
