import { createSelectors } from '@frontend/helper/store';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createHelperSlice } from './helper-slice';
import { initialState } from './initial-state';
import { createInteractionSlice } from './interaction-slice';
import { createNodesEdgesSlice } from './nodes-edges-slice';
import type { TopologyStore } from './types';
import { createViewSlice } from './view-slice';

export const createTopologyStore = () =>
  createSelectors(
    create<TopologyStore>()(
      immer((...a) => ({
        ...initialState,
        actions: {
          ...createViewSlice(...a),
          ...createInteractionSlice(...a),
          ...createNodesEdgesSlice(...a),
          ...createHelperSlice(...a),
          reset: () => a[0](initialState),
        },
      })),
    ),
  );

export type TopologyStoreApi = ReturnType<typeof createTopologyStore>;
