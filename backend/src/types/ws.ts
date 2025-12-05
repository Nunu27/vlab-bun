import type { Role } from "@backend/db/schema/auth";
import type { TSchema } from "elysia";
import type { Static, TProperties } from "typebox/type";

export type WSEventType = "client2server" | "server2client" | "inter";

export type WSSchema<
	TName extends string,
	TType extends WSEventType,
	TData extends TSchema = TSchema,
	TReply extends TProperties = never
> = {
	type: TType;
	name: TName;
	data: TData;
	reply?: TReply;
	private?: Role[];
};

// Helper type to create reply data structure
export type ReplyData<TReply extends TProperties> =
	| {
			[K in keyof TReply]: {
				type: K;
				data: Static<TReply[K]>;
			};
	  }[keyof TReply]
	| {
			type: "done";
			data?: null;
	  };

export type ReplyFunction<TReply extends TProperties> = {
	<K extends keyof TReply>(type: K, data: Static<TReply[K]>): void;
	(type: "done"): void;
	(type: "error", data: string): void;
};

// Helper type to extract events with replies
type EventsWithReplies<
	TEvents extends ReadonlyArray<WSSchema<any, any, any, any>>,
	TType extends WSEventType,
	TInverseType extends WSEventType = TType extends "inter"
		? "inter"
		: TType extends "client2server"
		? "server2client"
		: "client2server"
> = {
	[K in Extract<
		TEvents[number],
		{ type: TInverseType }
	> as K["reply"] extends undefined ? never : `${K["name"]}/reply`]: (
		data: ReplyData<NonNullable<K["reply"]>>
	) => void;
};

export type ExtractEvents<
	TEvents extends ReadonlyArray<WSSchema<any, any, any, any>>,
	TType extends WSEventType
> = {
	[K in Extract<TEvents[number], { type: TType }> as K["name"]]: (
		data: K["data"]["static"]
	) => void;
} & EventsWithReplies<TEvents, TType>;
