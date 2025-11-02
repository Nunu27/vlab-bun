'use client';

import * as React from 'react';

import { Button } from '@frontend/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@frontend/components/ui/command';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@frontend/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@frontend/components/ui/popover';
import { Spinner } from '@frontend/components/ui/spinner';
import { useIsMobile } from '@frontend/hooks/use-mobile';
import { cn } from '@frontend/lib/utils';
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';

type Option = {
  value: string;
  label: string;
};

type ComboBoxProps = {
  options?: Option[];
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  width?: string;
  showCheck?: boolean;
  allowClear?: boolean;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSearchChange?: (search: string) => void;
  shouldFilter?: boolean;
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
  showCheck = false,
  allowClear = false,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onSearchChange,
  shouldFilter = true,
}: ComboBoxProps) {
  const [open, setOpen] = React.useState(false);
  const searchRef = React.useRef('');
  const isMobile = useIsMobile();

  const selectedOption = React.useMemo(() => {
    return options.find((option) => option.value === value) || null;
  }, [options, value]);

  React.useEffect(() => {
    console.log('ComboBox options:', options, value, selectedOption);
  }, [selectedOption]);

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

  const handleSearchChange = (newSearch: string) => {
    searchRef.current = newSearch;
    onSearchChange?.(newSearch);
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            className={cn(width, 'justify-between cursor-pointer!')}
            disabled={disabled}
          >
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <div className="flex items-center gap-1">
              {allowClear && value && (
                <button
                  type="button"
                  className="flex items-center"
                  onClick={handleClear}
                >
                  <XIcon className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100 cursor-pointer" />
                </button>
              )}
              <ChevronsUpDownIcon className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mt-4 border-t">
            <OptionList
              options={options}
              value={value}
              onSelect={handleSelect}
              searchPlaceholder={searchPlaceholder}
              emptyMessage={emptyMessage}
              showCheck={showCheck}
              isLoading={isLoading}
              hasMore={hasMore}
              onLoadMore={onLoadMore}
              onSearchChange={handleSearchChange}
              shouldFilter={shouldFilter}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(width, 'justify-between cursor-pointer!')}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <div className="flex items-center gap-1">
            {allowClear && value && (
              <button
                type="button"
                className="flex items-center"
                onClick={handleClear}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <XIcon className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100 cursor-pointer" />
              </button>
            )}
            <ChevronsUpDownIcon className="h-4 w-4 shrink-0 opacity-50" />
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
          showCheck={showCheck}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          onSearchChange={handleSearchChange}
          shouldFilter={shouldFilter}
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
  showCheck,
  isLoading,
  hasMore,
  onLoadMore,
  onSearchChange,
  shouldFilter,
}: {
  options: Option[];
  value?: string;
  onSelect: (value: string) => void;
  searchPlaceholder: string;
  emptyMessage: string;
  showCheck: boolean;
  isLoading: boolean;
  hasMore: boolean;
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
              onSelect={onSelect}
              className="justify-between"
            >
              <span className="truncate">{option.label}</span>
              {showCheck && (
                <CheckIcon
                  className={cn(
                    'ml-auto shrink-0',
                    value === option.value ? 'opacity-100' : 'opacity-0',
                  )}
                />
              )}
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
