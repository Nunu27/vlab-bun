import { DynamicIcon } from '@frontend/components/dynamic-icon';
import { Settings } from 'lucide-react';
import { GRID_SIZE } from './constants';
import type { Position } from './types';

export const getIcon = (name: string, className?: string) => {
  const props = { className: className || 'w-6 h-6' };
  return (
    <DynamicIcon
      name={name}
      {...props}
      fallback={
        <Settings {...props} className={props.className + ' opacity-50'} />
      }
    />
  );
};

export const snapToGrid = (val: number) =>
  Math.round(val / GRID_SIZE) * GRID_SIZE;

export function cross(a: Position, b: Position, o: Position) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}
