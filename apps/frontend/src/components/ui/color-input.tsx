'use client';

import * as React from 'react';

import { cn } from '@frontend/lib/utils';

interface ColorInputProps extends Omit<
  React.ComponentProps<'input'>,
  'type' | 'onChange' | 'value'
> {
  value?: string;
  onChange?: (value: string) => void;
}

export function ColorInput({
  className,
  value = '#000000',
  onChange,
  disabled,
  ...props
}: ColorInputProps) {
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div
      className={cn(
        'border-input dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 flex h-9 w-full min-w-0 items-center rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] focus-within:ring-[3px] md:text-sm',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <div className="relative mr-2 flex shrink-0 items-center">
        <div
          className="border-input h-4 w-4 rounded-full border shadow-xs transition-colors"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={handleColorChange}
          disabled={disabled}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </div>
      <div className="bg-border mr-2 h-4 w-px" />
      <input
        value={value}
        onChange={handleTextChange}
        placeholder="#000000"
        className="placeholder:text-muted-foreground flex-1 bg-transparent font-mono uppercase outline-none disabled:cursor-not-allowed"
        maxLength={7}
        disabled={disabled}
        {...props}
      />
    </div>
  );
}
