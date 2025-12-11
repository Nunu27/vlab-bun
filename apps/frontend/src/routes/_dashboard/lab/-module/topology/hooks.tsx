import { useContext } from 'react';
import { useStore } from 'zustand';
import { TopologyContext } from './context';
import type { TopologyState } from './store';

export function useTopologyStore(): TopologyState;
export function useTopologyStore<T>(selector: (state: TopologyState) => T): T;
export function useTopologyStore<T>(selector?: (state: TopologyState) => T) {
  const store = useContext(TopologyContext);
  if (!store) {
    throw new Error('useTopologyStore must be used within a TopologyProvider');
  }
  return useStore(store, selector as (state: TopologyState) => T);
}

export const useTopologyStoreApi = () => {
  const store = useContext(TopologyContext);
  if (!store) {
    throw new Error(
      'useTopologyStoreApi must be used within a TopologyProvider',
    );
  }
  return store;
};
