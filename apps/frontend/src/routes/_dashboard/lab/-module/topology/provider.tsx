import { useState } from 'react';
import { TopologyContext } from './context';
import { createTopologyStore } from './stores';

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
