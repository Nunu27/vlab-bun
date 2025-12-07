import { PaginatedComboBox } from '@frontend/components/ui/combobox';
import type { TreatyResponse } from '@frontend/lib/api-types';
import type { PaginatedResponse } from '@frontend/types/pagination';

export type FilterComboboxProps<TItem> = {
  label: string;
  queryKey: (params: { page: number; search?: string }) => readonly unknown[];
  queryFn: (params: {
    page: number;
    search?: string;
  }) => Promise<TreatyResponse<{ data: PaginatedResponse<TItem> }>>;
  getItemValue: (item: TItem) => string;
  getItemLabel: (item: TItem) => string;
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  width?: string;
};

export function DataTableFilterCombobox<TItem>({
  label,
  queryKey,
  queryFn,
  getItemValue,
  getItemLabel,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  disabled = false,
  width = 'w-[200px]',
}: FilterComboboxProps<TItem>) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{label}:</span>
      <PaginatedComboBox
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        disabled={disabled}
        width={width}
        allowClear={true}
        queryKey={[...queryKey({ page: 1 })]}
        fetcher={queryFn}
        renderOption={(item) => ({
          value: getItemValue(item as TItem),
          label: getItemLabel(item as TItem),
        })}
      />
    </div>
  );
}
