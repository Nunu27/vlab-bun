import { useContext } from 'react';
import { TopologyContext } from './context';

export function useTopologyStore() {
  const store = useContext(TopologyContext);
  if (!store) {
    throw new Error('useTopologyStore must be used within a TopologyProvider');
  }

  return store;
}
