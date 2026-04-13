import type { Static, TProperties, TSchema } from "@sinclair/typebox";
import type WSContracts from "./base/contracts";

export type WSEventType = "client2server" | "server2client" | "inter";

// Use Record<string, unknown> instead of any for stricter constraints
export interface BaseWSContract<
	TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
	event: string;
	type: WSEventType;
	data?: TSchema;
	replies?: TProperties;
	meta?: TMeta;
}

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type MaybePromise<T> = T | Promise<T>;

/** Extracts the expected meta type out of the WSContracts instance. */
export type ExtractMeta<T> =
	T extends WSContracts<infer M, infer _> ? M : never;

/** Utility type to filter mapped contracts by event type (`client2server`, `server2client`, `inter`) */
export type ExtractWSContracts<
	TContracts extends Record<string, BaseWSContract<Record<string, unknown>>>,
	TType extends WSEventType,
> = {
	[TEvent in keyof TContracts as TContracts[TEvent]["type"] extends TType
		? TEvent
		: never]: TContracts[TEvent];
};

/** Extracts parameters from a bracketed route notation string e.g., "chat:send:[roomId]" -> { roomId: string } */
export type EventParams<TEvent extends string> =
	TEvent extends `${string}:[${infer Param}]${infer Rest}`
		? { [K in Param]: string } & EventParams<Rest>
		: Record<never, never>;

/** Validates whether a given TEvent needs a parameters object or not. */
export type WSParamsConfig<TEvent extends string> =
	keyof EventParams<TEvent> extends never
		? Record<never, never>
		: { params: EventParams<TEvent> };

/** Extracts the runtime TypeBox static TS type for the incoming or outgoing payload `data` */
export type ExtractWSData<TContract extends BaseWSContract> =
	NonNullable<TContract["data"]> extends TSchema
		? Static<NonNullable<TContract["data"]>>
		: undefined;

export type WSDataConfig<TContract extends BaseWSContract> = [
	TContract["data"],
] extends [undefined]
	? Record<never, never>
	: { data: Static<NonNullable<TContract["data"]>> };

/** Specifically for emit on the client */
export type WSClientDataConfig<TContract extends BaseWSContract> =
	Static<NonNullable<TContract["data"]>> extends never
		? Record<never, never>
		: { data: Static<NonNullable<TContract["data"]>> };

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

export type WSClientEmitConfig<
	TEvent extends string,
	TContract extends BaseWSContract,
> = Simplify<
	WSClientDataConfig<TContract> &
		WSParamsConfig<TEvent> &
		WSClientCallbacksConfig<TContract>
>;

export type WSServerEmitConfig<
	TEvent extends string,
	TContract extends BaseWSContract,
> = Simplify<WSDataConfig<TContract> & WSParamsConfig<TEvent>>;

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
	data: ExtractWSData<TEventContract>,
) => void | Promise<void>;
