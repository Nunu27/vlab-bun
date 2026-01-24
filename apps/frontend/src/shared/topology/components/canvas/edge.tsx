import { memo } from 'react';
import { DEFAULT_DEVICE_HEIGHT, DEFAULT_DEVICE_WIDTH } from '../../constants';
import type { EdgeData, NodeData } from '../../types';

interface EdgeProps {
  edge: EdgeData;
  source: NodeData;
  target: NodeData;
  onClick: (e: React.MouseEvent, edgeId: string) => void;
  edgeIndex: number;
  totalParallel: number;
}

export const EdgeComponent = memo(
  ({ edge, source, target, onClick, edgeIndex, totalParallel }: EdgeProps) => {
    const sx =
      source.x +
      (source.type === 'note' || source.type === 'group'
        ? source.width / 2
        : DEFAULT_DEVICE_WIDTH / 2);
    const sy =
      source.y +
      (source.type === 'note' || source.type === 'group'
        ? source.height / 2
        : DEFAULT_DEVICE_HEIGHT / 2);
    const tx =
      target.x +
      (target.type === 'note' || target.type === 'group'
        ? target.width / 2
        : DEFAULT_DEVICE_WIDTH / 2);
    const ty =
      target.y +
      (target.type === 'note' || target.type === 'group'
        ? target.height / 2
        : DEFAULT_DEVICE_HEIGHT / 2);

    // Calculate curve offset for parallel edges
    let curvature = 0;
    if (totalParallel > 1) {
      // Distribute edges symmetrically around center
      const maxOffset = 80;
      const step = maxOffset / (totalParallel - 1);
      curvature = (edgeIndex - (totalParallel - 1) / 2) * step;
    }

    const sLabelWidth = Math.max(40, edge.sourceHandle.length * 5 + 8);
    const tLabelWidth = Math.max(40, edge.targetHandle.length * 5 + 8);

    // Calculate control point for curve
    const midX = (sx + tx) / 2;
    const midY = (sy + ty) / 2;

    // Perpendicular offset for curve
    const dx = tx - sx;
    const dy = ty - sy;
    const length = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / length;
    const perpY = dx / length;

    const controlX = midX + perpX * curvature;
    const controlY = midY + perpY * curvature;

    // Create curved path
    const pathData =
      curvature === 0
        ? `M ${sx} ${sy} L ${tx} ${ty}`
        : `M ${sx} ${sy} Q ${controlX} ${controlY} ${tx} ${ty}`;

    // Calculate label positions with offset from nodes
    const labelOffset = 70; // Distance from node center
    const angle = Math.atan2(ty - sy, tx - sx);

    // Calculate base positions along the edge direction
    let sLabelX = sx + labelOffset * Math.cos(angle);
    let sLabelY = sy + labelOffset * Math.sin(angle);
    let tLabelX = tx - labelOffset * Math.cos(angle);
    let tLabelY = ty - labelOffset * Math.sin(angle);

    // Add curvature offset if edge is curved
    if (curvature !== 0) {
      // Apply perpendicular offset based on curvature
      const curveOffsetRatio = 0.3; // How much curve affects label position
      sLabelX += perpX * curvature * curveOffsetRatio;
      sLabelY += perpY * curvature * curveOffsetRatio;
      tLabelX += perpX * curvature * curveOffsetRatio;
      tLabelY += perpY * curvature * curveOffsetRatio;
    }

    // Add extra Y offset if label is below the node (to avoid node label overlap)
    const nodeHeight =
      source.type === 'device' ? DEFAULT_DEVICE_HEIGHT : source.height;
    const targetHeight =
      target.type === 'device' ? DEFAULT_DEVICE_HEIGHT : target.height;

    // Check if source label is below source node
    if (sLabelY > sy + nodeHeight / 2) {
      sLabelY += 20; // Extra offset to avoid node label
    }

    // Check if target label is below target node
    if (tLabelY > ty + targetHeight / 2) {
      tLabelY += 20; // Extra offset to avoid node label
    }

    return (
      <g
        className="group"
        onClick={(e) => onClick(e, edge.id)}
        style={{ pointerEvents: 'all', cursor: 'pointer' }}
      >
        <path d={pathData} className="fill-none stroke-transparent stroke-20" />
        <path
          d={pathData}
          className={`fill-none stroke-[3px] transition-colors ${edge.selected ? 'stroke-orange-500' : 'dark:stroke-muted-foreground/40 dark:group-hover:stroke-muted-foreground stroke-gray-400 group-hover:stroke-gray-600'}`}
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
            {edge.sourceHandle}
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
            {edge.targetHandle}
          </text>
        </g>
      </g>
    );
  },
);
