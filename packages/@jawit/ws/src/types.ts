import type { Static, TProperties, TSchema } from "@sinclair/typebox";

export type WSEventType = "client2server" | "server2client" | "inter";

export type BaseWSContract<TMeta extends Record<string, unknown>> = {
	event: string;
	type: WSEventType;
	data: TSchema;
	replies?: TProperties;
	meta?: TMeta;
};

export type ExtractWSContracts<
	TMeta extends Record<string, unknown>,
	TContracts extends Record<string, BaseWSContract<TMeta>>,
	TType extends WSEventType,
> = {
	[TEvent in keyof TContracts]: TContracts[TEvent]["type"] extends TType
		? TContracts[TEvent]
		: never;
};

export type ExtractPathParams<TEvent extends string> =
	TEvent extends `${infer _Start}:[${infer Param}]${infer Rest}`
		? { [K in Param]: string } & (ExtractPathParams<Rest> extends never
				? unknown
				: ExtractPathParams<Rest>)
		: never;

export type EventParams<TEvent extends string> = ExtractPathParams<TEvent>;

export type MaybePromise<T> = T | Promise<T>;

export type WSServerHandler<
	TEvent extends string,
	TEventContract extends {
		data: TSchema;
		event: string;
		replies?: TProperties;
	},
> = (
	config: {
		data: Static<TEventContract["data"]>;
		executionId?: string;
	} & (EventParams<TEvent> extends never
		? unknown
		: { params: EventParams<TEvent> }) &
		(TEventContract["replies"] extends undefined
			? unknown
			: {
					reply: <
						TReplies extends NonNullable<TEventContract["replies"]>,
						K extends keyof TReplies,
					>(
						type: K,
						data: Static<TReplies[K]>,
					) => void;
				}),
) => MaybePromise<void>;

export type WSServerMiddleware<TContext, TMeta> = (
	context: TContext,
	meta: TMeta,
) => MaybePromise<boolean | undefined>;

export type WSClientHandler<
	TEventContract extends { data: TSchema; event: string },
> = (data: Static<TEventContract["data"]>) => void | Promise<void>;
