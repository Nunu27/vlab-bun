import type {
  ActionConfigItem,
  ActionStore,
  InferSchemaFromConfig,
  WithSelectors,
} from '@frontend/types/store';
import { createContext, createElement, useContext, useState } from 'react';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

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

export const createActionStore = <TData>() => {
  return <const TConfig extends ReadonlyArray<ActionConfigItem>>(
    actions: TConfig,
  ) => {
    type Schema = InferSchemaFromConfig<TData, TConfig>;
    type StoreType = ActionStore<Schema>;

    return create<StoreType>()((set) => {
      const state: Record<string, unknown> = {};
      const actionMethods: Record<string, unknown> = {};

      actions.forEach((item) => {
        let key: string;
        let isCreate = false;

        if (typeof item === 'string') {
          key = item;
          isCreate = key === 'create';
        } else {
          key = item[0];
          isCreate = false;
        }

        state[key] = isCreate ? false : null;

        const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;

        if (isCreate) {
          actionMethods[setterName] = (value: boolean = true) =>
            set({ [key]: value } as unknown as Partial<StoreType>);
        } else {
          actionMethods[setterName] = (data: unknown) =>
            set({ [key]: data } as unknown as Partial<StoreType>);
        }
      });

      return {
        ...state,
        actions: actionMethods,
      } as unknown as StoreType;
    });
  };
};

export const createScopedActionStore = <TData>() => {
  return <const TConfig extends ReadonlyArray<ActionConfigItem>>(
    actions: TConfig,
  ) => createScopedStore(() => createActionStore<TData>()(actions));
};
