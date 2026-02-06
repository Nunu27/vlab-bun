import {
	createContext,
	createElement,
	type ReactNode,
	useContext,
	useState,
} from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import { createActionStore, createSelectors } from "./index";
import type { ActionConfigItem, WithSelectors } from "./types";

export const createScopedStore = <S extends UseBoundStore<StoreApi<object>>>(
	factory: () => S,
) => {
	const StoreContext = createContext<WithSelectors<S> | null>(null);

	return {
		Provider: ({ children }: { children: ReactNode }) => {
			const [store] = useState(() => createSelectors(factory()));

			return createElement(StoreContext.Provider, { value: store }, children);
		},
		useContext: () => {
			const store = useContext(StoreContext);
			if (!store) {
				throw new Error("useStore must be used within a Provider");
			}
			return store;
		},
	};
};

export const createScopedActionStore = <TData>() => {
	return <const TConfig extends ReadonlyArray<ActionConfigItem>>(
		actions: TConfig,
	) => createScopedStore(() => createActionStore<TData>()(actions));
};
