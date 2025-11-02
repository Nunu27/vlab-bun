'use client';

import * as React from 'react';

import { Button } from '@frontend/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@frontend/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@frontend/components/ui/popover';
import { Checkbox } from '@frontend/components/ui/checkbox';
import { cn } from '@frontend/lib/utils';
import { ChevronsUpDownIcon } from 'lucide-react';

type Option = {
  value: string;
  label: string;
  checked: boolean;
};

type MultiComboBoxProps = {
  options: Option[];
  onChange: (value: string, checked: boolean) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  width?: string;
  icon?: React.ReactNode;
  label?: string;
};

export function MultiComboBox({
  options,
  onChange,
  placeholder = 'Select options...',
  emptyMessage = 'No options found.',
  disabled = false,
  width = 'w-auto',
  icon,
  label,
}: MultiComboBoxProps) {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (value: string, checked: boolean) => {
    onChange(value, checked);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(width, 'justify-between cursor-pointer! gap-2')}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            {icon}
            {label && <span className="hidden lg:inline">{label}</span>}
            {!label && <span className="truncate">{placeholder}</span>}
          </div>
          <ChevronsUpDownIcon className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <Command>
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  className="capitalize cursor-pointer"
                  onSelect={() => {
                    handleToggle(option.value, !option.checked);
                  }}
                >
                  <Checkbox
                    checked={option.checked}
                    onCheckedChange={(checked) =>
                      handleToggle(option.value, !!checked)
                    }
                    className="mr-2"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
