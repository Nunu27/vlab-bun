import type { Static, TProperties, TSchema } from "@sinclair/typebox";
import type WSContracts from "./base/contracts";

export type WSEventType = "client2server" | "server2client" | "inter";

// biome-ignore lint/suspicious/noExplicitAny: generic constraint
export type BaseWSContract<TMeta extends Record<string, unknown> = any> = {
	event: string;
	type: WSEventType;
	data?: TSchema;
	replies?: TProperties;
	meta?: TMeta;
};

export type ExtractWSContracts<
	// biome-ignore lint/suspicious/noExplicitAny: generic constraint
	TContracts extends Record<string, BaseWSContract<any>>,
	TType extends WSEventType,
> = {
	[TEvent in keyof TContracts as TContracts[TEvent]["type"] extends TType
		? TEvent
		: never]: TContracts[TEvent];
};

export type EventParams<TEvent extends string> =
	TEvent extends `${infer _Start}:[${infer Param}]${infer Rest}`
		? { [K in Param]: string } & EventParams<Rest>
		: Record<string, never>; // Return empty object instead of never when no params

// Helper to clean up object types
export type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type MaybePromise<T> = T | Promise<T>;

export type WSDataConfig<TContract extends BaseWSContract> = [
	TContract["data"],
] extends [undefined]
	? Record<string, never>
	: { data: Static<NonNullable<TContract["data"]>> };

export type WSClientDataConfig<TContract extends BaseWSContract> = [
	NonNullable<TContract["data"]>,
] extends [TSchema]
	? { data: Static<NonNullable<TContract["data"]>> }
	: Record<string, never>;

export type WSParamsConfig<TEvent extends string> =
	EventParams<TEvent> extends Record<string, never>
		? Record<string, never>
		: { params: EventParams<TEvent> };

export type WSServerRepliesConfig<TContract extends BaseWSContract> = [
	TContract["replies"],
] extends [undefined]
	? Record<string, never>
	: {
			reply: <
				TReplies extends NonNullable<TContract["replies"]>,
				K extends keyof TReplies,
			>(
				type: K,
				data: Static<TReplies[K]>,
			) => void;
		};

export type WSClientCallbacksConfig<TContract extends BaseWSContract> = [
	NonNullable<TContract["replies"]>,
] extends [Record<string, unknown>]
	? {
			callbacks?: Partial<{
				[K in keyof NonNullable<TContract["replies"]>]: (
					data: Static<NonNullable<TContract["replies"]>[K]>,
				) => void;
			}>;
			onError?: (error: string) => void;
			timeoutMs?: number;
		}
	: Record<string, never>;

export type WSServerHandler<
	TEvent extends string,
	TEventContract extends BaseWSContract,
	TContext = unknown,
> = (
	config: Simplify<
		{ executionId?: string; socket: TContext } & WSDataConfig<TEventContract> &
			WSParamsConfig<TEvent> &
			WSServerRepliesConfig<TEventContract>
	>,
) => MaybePromise<void>;

export type WSServerMiddleware<TContext, TMeta> = (
	context: { socket: TContext; meta?: TMeta },
	next: (err?: Error) => void,
) => void | Promise<void>;

export type WSClientHandler<TEventContract extends BaseWSContract> = (
	data: [TEventContract["data"]] extends [undefined]
		? undefined
		: Static<NonNullable<TEventContract["data"]>>,
) => void | Promise<void>;

// biome-ignore lint/suspicious/noExplicitAny: generic constraint
export type ExtractMeta<T> = T extends WSContracts<infer M, any> ? M : never;
