import { useState } from 'react';
import { createTopologyStore } from './store';
import { TopologyContext } from './context';

export const TopologyProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [store] = useState(() => createTopologyStore());

  return (
    <TopologyContext.Provider value={store}>
      {children}
    </TopologyContext.Provider>
  );
};
