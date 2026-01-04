'use client';

import * as React from 'react';

import { Button, buttonVariants } from '@frontend/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@frontend/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@frontend/components/ui/popover';
import { Spinner } from '@frontend/components/ui/spinner';
import { cn } from '@frontend/lib/utils';
import type { TreatyResponse } from '@frontend/types/api';
import type { PaginatedResponse } from '@frontend/types/pagination';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useDebounceValue } from 'usehooks-ts';
import { getErrorMessageFromApi } from '@frontend/helper/error';

type Option = {
  value: string;
  label: string;
};

type BaseComboBoxProps = {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  width?: string;
  allowClear?: boolean;
};

type ComboBoxProps = BaseComboBoxProps & {
  options?: Option[];
};

export function ComboBox({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No option found.',
  disabled = false,
  width = 'w-[150px]',
  allowClear = false,
}: ComboBoxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = React.useMemo(() => {
    return options.find((option) => option.value === value) || null;
  }, [options, value]);

  const handleSelect = (currentValue: string) => {
    if (currentValue === value) {
      onChange?.(undefined);
    } else {
      onChange?.(currentValue);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange?.(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            width,
            'dark:bg-input/30 cursor-pointer! justify-between bg-transparent',
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption?.label ?? placeholder}
          </span>
          <div className="flex items-center">
            {allowClear && value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  'm-2 size-6',
                )}
                onClick={handleClear}
              >
                <XIcon className="opacity-50 hover:opacity-100" />
              </span>
            )}
            <ChevronsUpDownIcon className="opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(width, 'p-0')} align="start">
        <OptionList
          options={options}
          value={value}
          onSelect={handleSelect}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          shouldFilter={true}
          onSearchChange={() => {}}
        />
      </PopoverContent>
    </Popover>
  );
}

type PaginatedComboBoxProps<TData> = BaseComboBoxProps & {
  queryKey: unknown[];
  fetcher: (params: {
    page: number;
    search?: string;
  }) => Promise<TreatyResponse<{ data: PaginatedResponse<TData> }>>;
  renderOption: (item: TData) => Option;
  defaultOptions?: Option[];
};

export function PaginatedComboBox<TData>({
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No option found.',
  disabled = false,
  width = 'w-[150px]',
  allowClear = false,
  queryKey,
  fetcher,
  renderOption,
  defaultOptions = [],
}: PaginatedComboBoxProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = useDebounceValue('', 300);

  const { data, fetchNextPage, hasNextPage, isFetching, error } =
    useInfiniteQuery({
      queryKey: [...queryKey, search],
      queryFn: async ({ pageParam = 1 }) => {
        const response = await fetcher({
          page: pageParam,
          search: search || undefined,
        });
        if (response.error) {
          throw new Error(getErrorMessageFromApi(response.error.value));
        }
        return response.data!.data;
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        if (lastPage.pageInfo.page < lastPage.pageInfo.totalPages) {
          return lastPage.pageInfo.page + 1;
        }
        return undefined;
      },
      enabled: open,
      staleTime: 1000 * 60 * 5,
    });

  React.useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

  const options = React.useMemo(() => {
    const fetchedOptions =
      data?.pages.flatMap((page) => page.items.map(renderOption)) ?? [];
    const allOptions = [...defaultOptions, ...fetchedOptions];

    // Deduplicate by value
    const uniqueOptions = Array.from(
      new Map(allOptions.map((item) => [item.value, item])).values(),
    );

    return uniqueOptions;
  }, [data, renderOption, defaultOptions]);

  const selectedOption = React.useMemo(() => {
    return options.find((option) => option.value === value) || null;
  }, [options, value]);

  const handleSelect = (currentValue: string) => {
    if (currentValue === value) {
      onChange?.(undefined);
    } else {
      onChange?.(currentValue);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange?.(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            width,
            'dark:bg-input/30 cursor-pointer! justify-between bg-transparent',
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption?.label ?? placeholder}
          </span>
          <div className="flex items-center">
            {allowClear && value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  'm-2 size-6',
                )}
                onClick={handleClear}
              >
                <XIcon className="opacity-50 hover:opacity-100" />
              </span>
            )}
            <ChevronsUpDownIcon className="opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(width, 'p-0')} align="start">
        <OptionList
          options={options}
          value={value}
          onSelect={handleSelect}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          isLoading={isFetching}
          hasMore={hasNextPage}
          onLoadMore={() => fetchNextPage()}
          onSearchChange={setSearch}
          shouldFilter={false}
        />
      </PopoverContent>
    </Popover>
  );
}

function OptionList({
  options,
  value,
  onSelect,
  searchPlaceholder,
  emptyMessage,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onSearchChange,
  shouldFilter,
}: {
  options: Option[];
  value?: string;
  onSelect: (value: string) => void;
  searchPlaceholder: string;
  emptyMessage: string;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSearchChange: (search: string) => void;
  shouldFilter: boolean;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!onLoadMore || !hasMore || isLoading) return;

    const target = e.currentTarget;
    const bottom =
      target.scrollHeight - target.scrollTop <= target.clientHeight + 50;

    if (bottom) {
      onLoadMore();
    }
  };

  return (
    <Command shouldFilter={shouldFilter}>
      <CommandInput
        placeholder={searchPlaceholder}
        onValueChange={onSearchChange}
      />
      <CommandList ref={listRef} onScroll={handleScroll}>
        <CommandEmpty>
          {isLoading ? <Spinner className="size-6 py-3" /> : emptyMessage}
        </CommandEmpty>
        <CommandGroup>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.value}
              keywords={[option.label]}
              onSelect={onSelect}
            >
              <span className="truncate">{option.label}</span>
              <CheckIcon
                className={cn(
                  'ml-auto',
                  value === option.value ? 'opacity-100' : 'opacity-0',
                )}
              />
            </CommandItem>
          ))}
          {hasMore && isLoading && (
            <div className="flex items-center justify-center py-2">
              <Spinner className="size-4" />
            </div>
          )}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
