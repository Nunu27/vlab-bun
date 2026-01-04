import { createContext, useContext, useState, createElement } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & {
      use: { [K in keyof T]: <U = T[K]>(selector?: (value: T[K]) => U) => U };
    }
  : never;

export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S,
) => {
  type StoreWithSelectors = WithSelectors<typeof _store>;
  const store = _store as StoreWithSelectors;
  store.use = {};
  for (const k of Object.keys(store.getState())) {
    store.use[k as keyof typeof store.use] = (<U>(
      selector?: (value: unknown) => U,
    ) => {
      if (selector) {
        return store((s) => selector(s[k as keyof typeof s]));
      }
      return store((s) => s[k as keyof typeof s]);
    }) as never;
  }

  return store;
};

export const createScopedStore = <S extends UseBoundStore<StoreApi<object>>>(
  factory: () => S,
) => {
  const StoreContext = createContext<WithSelectors<S> | null>(null);

  return {
    Provider: ({ children }: { children: React.ReactNode }) => {
      const [store] = useState(() => createSelectors(factory()));

      return createElement(StoreContext.Provider, { value: store }, children);
    },
    useContext: () => {
      const store = useContext(StoreContext);
      if (!store) {
        throw new Error('useStore must be used within a Provider');
      }
      return store;
    },
  };
};
