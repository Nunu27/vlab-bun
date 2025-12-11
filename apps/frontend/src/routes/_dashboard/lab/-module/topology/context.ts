import { createContext } from 'react';
import type { TopologyStore } from './store';

export const TopologyContext = createContext<TopologyStore | null>(null);
