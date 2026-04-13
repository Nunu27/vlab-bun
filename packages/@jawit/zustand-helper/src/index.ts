import { create, type StoreApi, type UseBoundStore } from "zustand";
import type {
	InferSchemaFromConfig,
	ModalConfigItem,
	ModalStore,
	WithSelectors,
} from "./types";

export * from "./types";

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

export const createModalStore = <TData>() => {
	return <const TConfig extends ReadonlyArray<ModalConfigItem>>(
		actions: TConfig,
	) => {
		type Schema = InferSchemaFromConfig<TData, TConfig>;
		type StoreType = ModalStore<Schema>;

		return create<StoreType>()((set) => {
			const state: Record<string, unknown> = {};
			const actionMethods: Record<string, unknown> = {};

			actions.forEach((item) => {
				let key: string;
				let isCreate = false;

				if (typeof item === "string") {
					key = item;
					isCreate = key === "create";
				} else {
					key = item[0];
					isCreate = false;
				}

				state[key] = isCreate ? false : null;

				if (isCreate) {
					actionMethods[key] = {
						open: () => set({ [key]: true } as Partial<StoreType>),
						close: () => set({ [key]: false } as Partial<StoreType>),
						toggle: () =>
							set(
								(state) =>
									({
										[key]: !state[key as keyof typeof state],
									}) as Partial<StoreType>,
							),
					};
				} else {
					actionMethods[key] = {
						open: (data: unknown) => set({ [key]: data } as Partial<StoreType>),
						close: () => set({ [key]: null } as Partial<StoreType>),
						toggle: (data?: unknown) =>
							set(
								(state) =>
									({
										[key]: state[key as keyof typeof state]
											? null
											: (data ?? null),
									}) as Partial<StoreType>,
							),
					};
				}
			});

			return {
				...state,
				actions: actionMethods,
			} as StoreType;
		});
	};
};
