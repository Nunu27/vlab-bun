export type Logs<TTypes extends string> = {
  type: TTypes;
  message: string;
}[];

export type Store<TState, TActions> = TState & { actions: TActions };

export type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & {
      use: { [K in keyof T]-?: <U = T[K]>(selector?: (value: T[K]) => U) => U };
    }
  : never;

export type ActionConfigItem = string | readonly [string, unknown];

export type InferSchemaFromConfig<
  TData,
  TConfig extends ReadonlyArray<ActionConfigItem>,
> = {
  [K in Extract<TConfig[number], string>]: K extends 'create' ? boolean : TData;
} & {
  [T in Extract<TConfig[number], readonly [string, unknown]> as T[0]]: T[1];
};

export type ActionStore<TSchema> = {
  [K in keyof TSchema]: TSchema[K] extends boolean
    ? boolean
    : TSchema[K] | null;
} & {
  actions: {
    [K in keyof TSchema as `set${Capitalize<string & K>}`]: TSchema[K] extends boolean
      ? (value?: boolean) => void
      : (value: TSchema[K] | null) => void;
  };
};
