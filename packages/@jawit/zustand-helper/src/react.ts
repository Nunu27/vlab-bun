import {
	createContext,
	createElement,
	type ReactNode,
	useContext,
	useState,
} from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import { createModalStore, createSelectors } from "./index";
import type { ModalConfigItem, WithSelectors } from "./types";

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

export const createScopedModalStore = <TData>() => {
	return <const TConfig extends ReadonlyArray<ModalConfigItem>>(
		actions: TConfig,
	) => createScopedStore(() => createModalStore<TData>()(actions));
};
