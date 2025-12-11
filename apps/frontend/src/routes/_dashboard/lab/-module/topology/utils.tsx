import * as LucideIcons from 'lucide-react';
import { GRID_SIZE } from './constants';
import type { Position } from './types';

export const getIcon = (name: string, className?: string) => {
  const icons = LucideIcons as unknown as Record<
    string,
    LucideIcons.LucideIcon
  >;
  const Icon = icons[name];
  const props = { className: className || 'w-6 h-6' };

  if (!Icon) {
    return <LucideIcons.Settings {...props} />;
  }

  return <Icon {...props} />;
};

export const snapToGrid = (val: number) =>
  Math.round(val / GRID_SIZE) * GRID_SIZE;

export function cross(a: Position, b: Position, o: Position) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}
