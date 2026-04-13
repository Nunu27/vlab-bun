export type Store<TState, TActions> = TState & { actions: TActions };

export type WithSelectors<S> = S extends { getState: () => infer T }
	? S & {
			use: { [K in keyof T]-?: <U = T[K]>(selector?: (value: T[K]) => U) => U };
		}
	: never;

export type ModalConfigItem = string | readonly [string, unknown];

export type InferSchemaFromConfig<
	TData,
	TConfig extends ReadonlyArray<ModalConfigItem>,
> = {
	[K in Extract<TConfig[number], string>]: K extends "create" ? boolean : TData;
} & {
	[T in Extract<TConfig[number], readonly [string, unknown]> as T[0]]: T[1];
};

export type ModalStore<TSchema> = {
	[K in keyof TSchema]: TSchema[K] extends boolean
		? boolean
		: TSchema[K] | null;
} & {
	actions: {
		[K in keyof TSchema]: {
			open: TSchema[K] extends boolean
				? () => void
				: (value: TSchema[K]) => void;
			close: () => void;
			toggle: TSchema[K] extends boolean
				? () => void
				: (value?: TSchema[K]) => void;
		};
	};
};
