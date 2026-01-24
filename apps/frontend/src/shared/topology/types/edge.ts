import type { LabEdge } from '@vlab/shared/schemas/rest';

/**
 * Edge connection between device interfaces
 */
export interface EdgeData extends LabEdge {
  selected?: boolean;
}
