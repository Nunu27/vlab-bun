import { memo } from 'react';
import type { EdgeData, NodeData } from '../../types';

interface EdgeProps {
  edge: EdgeData;
  source: NodeData;
  target: NodeData;
  onClick: (e: React.MouseEvent, edgeId: string) => void;
  deviceMap: Map<
    string,
    {
      icon: string;
      categoryColor: string;
      resources: unknown;
      interfaces: unknown;
    }
  >;
}

export const EdgeComponent = memo(
  ({ edge, source, target, onClick, deviceMap }: EdgeProps) => {
    const sx = source.x + source.width / 2;
    const sy = source.y + source.height / 2;
    const tx = target.x + target.width / 2;
    const ty = target.y + target.height / 2;

    const getInterfaceName = (node: NodeData, handleId: string) => {
      if (node.type !== 'device') return '?';
      const device = deviceMap.get(node.deviceId);
      if (!device || !Array.isArray(device.interfaces)) return '?';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const iface = (device.interfaces as any[]).find(
        (i) => i.name === handleId,
      );
      return iface ? iface.name : '?';
    };

    const sourceIfaceName = getInterfaceName(source, edge.sourceHandle);
    const targetIfaceName = getInterfaceName(target, edge.targetHandle);

    const sLabelWidth = Math.max(40, sourceIfaceName.length * 5 + 8);
    const tLabelWidth = Math.max(40, targetIfaceName.length * 5 + 8);

    const angle = Math.atan2(ty - sy, tx - sx);

    const sOffset = 40 + sLabelWidth / 2;
    const tOffset = 40 + tLabelWidth / 2;

    const sLabelX = sx + sOffset * Math.cos(angle);
    const sLabelY = sy + sOffset * Math.sin(angle);
    const tLabelX = tx - tOffset * Math.cos(angle);
    const tLabelY = ty - tOffset * Math.sin(angle);

    return (
      <g
        className="group"
        onClick={(e) => onClick(e, edge.id)}
        style={{ pointerEvents: 'all', cursor: 'pointer' }}
      >
        <line
          x1={sx}
          y1={sy}
          x2={tx}
          y2={ty}
          className="stroke-transparent stroke-20"
        />
        <line
          x1={sx}
          y1={sy}
          x2={tx}
          y2={ty}
          className={`stroke-[3px] transition-colors ${edge.selected ? 'stroke-orange-500' : 'dark:stroke-muted-foreground/40 dark:group-hover:stroke-muted-foreground stroke-gray-400 group-hover:stroke-gray-600'}`}
        />

        <g transform={`translate(${sLabelX}, ${sLabelY})`}>
          <rect
            x={-sLabelWidth / 2}
            y="-8"
            width={sLabelWidth}
            height="16"
            rx="4"
            className="dark:fill-card dark:stroke-border fill-white stroke-gray-200 stroke-1 opacity-90"
          />
          <text
            y="3"
            textAnchor="middle"
            className="dark:fill-muted-foreground pointer-events-none fill-gray-600 font-mono text-[8px] select-none"
          >
            {sourceIfaceName}
          </text>
        </g>

        <g transform={`translate(${tLabelX}, ${tLabelY})`}>
          <rect
            x={-tLabelWidth / 2}
            y="-8"
            width={tLabelWidth}
            height="16"
            rx="4"
            className="dark:fill-card dark:stroke-border fill-white stroke-gray-200 stroke-1 opacity-90"
          />
          <text
            y="3"
            textAnchor="middle"
            className="dark:fill-muted-foreground pointer-events-none fill-gray-600 font-mono text-[8px] select-none"
          >
            {targetIfaceName}
          </text>
        </g>
      </g>
    );
  },
);
