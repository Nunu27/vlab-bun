import { DynamicIcon } from '@frontend/components/dynamic-icon';
import { Button } from '@frontend/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@frontend/components/ui/popover';
import { cn } from '@frontend/lib/utils';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function IconPicker({
  value,
  onChange,
  placeholder = 'Select icon...',
  className,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [iconNames, setIconNames] = useState<string[]>([]);

  useEffect(() => {
    import('lucide-react').then((module) => {
      const names = Object.keys(module).filter(
        (key) =>
          key !== 'icons' &&
          key !== 'createLucideIcon' &&
          !key.startsWith('Lucide') &&
          !key.endsWith('Icon'),
      );
      setIconNames(names);
    });
  }, []);

  const filteredIcons = useMemo(() => {
    if (!search) return iconNames.slice(0, 100); // Limit initial render
    return iconNames
      .filter((name) => name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 100); // Limit search results
  }, [iconNames, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className={cn(
            'group border-muted-foreground/25 bg-muted/30 hover:bg-muted/50 hover:border-primary relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-dashed transition-all',
            value && 'border-border bg-background border-solid',
            className,
          )}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setOpen(true);
            }
          }}
        >
          {value ? (
            <DynamicIcon name={value} className="text-primary size-10" />
          ) : (
            <>
              <Search className="text-muted-foreground/50 size-8" />
              <span className="text-muted-foreground text-sm">
                {placeholder}
              </span>
            </>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-75 p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-75 overflow-y-auto p-2">
          <div className="grid grid-cols-4 gap-2">
            {filteredIcons.map((name) => (
              <Button
                key={name}
                variant="ghost"
                className={cn(
                  'flex h-14 flex-col items-center justify-center gap-1 p-1',
                  value === name && 'bg-accent text-accent-foreground',
                )}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
              >
                <DynamicIcon name={name} className="h-6 w-6" />
                <span className="w-full truncate text-center text-[10px]">
                  {name}
                </span>
              </Button>
            ))}
            {filteredIcons.length === 0 && (
              <div className="text-muted-foreground col-span-4 py-6 text-center text-sm">
                No icons found.
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
