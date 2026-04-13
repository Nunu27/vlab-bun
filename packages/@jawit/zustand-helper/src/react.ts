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

export const createScopedStore = <
	S extends UseBoundStore<StoreApi<object>>,
	// biome-ignore lint/complexity/noBannedTypes: empty props
	P extends object = {},
>(
	factory: (props: P) => S,
) => {
	const StoreContext = createContext<WithSelectors<S> | null>(null);

	return {
		Provider: (props: { children: ReactNode } & P) => {
			const { children, ...factoryProps } = props;
			const [store] = useState(() =>
				createSelectors(factory(factoryProps as unknown as P)),
			);

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
