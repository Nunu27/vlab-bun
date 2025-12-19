import { lazy, Suspense } from 'react';
import { cn } from '@frontend/lib/utils';
import type { LucideIcon, LucideProps } from 'lucide-react';

const LucideIconsPromise = import('lucide-react');

const IconRenderer = lazy(async () => {
  const icons = await LucideIconsPromise;
  return {
    default: ({
      name,
      className,
      ...props
    }: LucideProps & {
      name: string;
    }) => {
      const Icon = (icons as unknown as Record<string, LucideIcon>)[name];

      if (!Icon) {
        console.warn(`Icon "${name}" not found`);
        return <div className={cn('bg-muted h-6 w-6 rounded-sm', className)} />;
      }

      return <Icon className={className} {...props} />;
    },
  };
});

interface DynamicIconProps extends LucideProps {
  name: string;
  fallback?: React.ReactNode;
}

export function DynamicIcon({
  name,
  className,
  fallback,
  ...props
}: DynamicIconProps) {
  return (
    <Suspense
      fallback={
        fallback || (
          <div
            className={cn(
              'bg-muted/20 h-6 w-6 animate-pulse rounded-sm',
              className,
            )}
          />
        )
      }
    >
      <IconRenderer name={name} className={className} {...props} />
    </Suspense>
  );
}
