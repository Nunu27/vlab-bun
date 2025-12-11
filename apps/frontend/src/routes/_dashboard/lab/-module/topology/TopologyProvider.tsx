import { useState } from 'react';
import { TopologyContext, createTopologyStore } from './store';

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
