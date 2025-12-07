import type { Role } from "../enums";
import type { TSchema } from "elysia";
import type { Static, TProperties } from "typebox";

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
	cleanup?: (id: string) => Promise<void> | void;
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
			type: "id";
			data: string;
	  }
	| {
			type: "done";
			data?: null;
	  }
	| {
			type: "error";
			data: string;
	  };

export type ReplyFunction<TReply extends TProperties> = {
	<K extends keyof TReply>(type: K, data: Static<TReply[K]>): void;
	(type: "done"): void;
	(type: "error", data: string): void;
};

export type ExtractEvents<
	TEvents extends ReadonlyArray<WSSchema<any, any, any, any>>,
	TType extends WSEventType
> = {
	[K in TEvents[number] as K["type"] extends TType ? K["name"] : never]: (
		data: Static<K["data"]>
	) => void;
};

export type ReplyEvents<
	TEvents extends ReadonlyArray<WSSchema<any, any, any, any>>
> = {
	[K in TEvents[number] as K["reply"] extends undefined
		? never
		: `${K["name"]}/reply`]: K["reply"] extends never
		? never
		: (data: ReplyData<NonNullable<K["reply"]>>) => void;
};

export const createWSSchema = <
	TName extends string,
	TType extends WSEventType,
	TData extends TSchema = TSchema,
	TReply extends TProperties = never
>(
	config: WSSchema<TName, TType, TData, TReply>
) => config;
