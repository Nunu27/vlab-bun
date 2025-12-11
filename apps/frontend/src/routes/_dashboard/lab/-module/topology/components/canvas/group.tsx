import { memo } from 'react';
import type { GroupNodeData } from '../../types';
import { Group } from 'lucide-react';

interface GroupProps {
  group: GroupNodeData;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
}

export const GroupComponent = memo(({ group, onMouseDown }: GroupProps) => {
  return (
    <g
      className="pointer-events-auto cursor-grab"
      onMouseDown={(e) => onMouseDown(e, group.id)}
    >
      <rect
        x={group.x}
        y={group.y}
        width={group.width}
        height={group.height}
        rx={12}
        fill={group.color || '#f3f4f6'}
        fillOpacity={0.25}
        stroke={group.selected ? '#6366f1' : '#9ca3af'}
        strokeWidth={group.selected ? 3 : 2}
        strokeDasharray={group.selected ? 'none' : '8,4'}
      />

      <foreignObject
        x={group.x + 12}
        y={group.y + 12}
        width={200}
        height={30}
        className="overflow-visible"
      >
        <div className="flex items-center gap-1.5">
          <Group size={14} className="text-foreground" />
          <span className="text-foreground text-[10px] font-extrabold tracking-wider whitespace-nowrap uppercase">
            {group.label}
          </span>
        </div>
      </foreignObject>
    </g>
  );
});
