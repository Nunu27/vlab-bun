import { createContext } from 'react';
import { type TopologyStoreApi } from './stores';

export const TopologyContext = createContext<TopologyStoreApi | null>(null);
