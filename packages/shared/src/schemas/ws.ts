import type { Static, TSchema } from "elysia";
import { t } from "elysia/type-system";
import { compile } from "elysia/type-system/utils";
import { Socket } from "socket.io";
import type { Session } from "../types";
import {
	createWSSchema,
	type ExtractEvents,
	type ReplyEvents,
	type ReplyFunction,
	type WSSchema
} from "../types/ws";
import { deviceWSSchemas } from "./device";
import { labWSSchemas } from "./lab";
import type { MaybePromise } from "bun";

const schemas = [
	...deviceWSSchemas,
	...labWSSchemas,
	createWSSchema({
		type: "server2client",
		name: "error",
		data: t.String()
	}),
	createWSSchema({
		type: "server2client",
		name: "ping",
		data: t.Null()
	}),
	createWSSchema({
		type: "client2server",
		name: "unsubscribe",
		data: t.String()
	})
] as const;

type Events = typeof schemas;

export const wsSchemas = Object.fromEntries(
	schemas.map((schema) => {
		const validator = compile(schema.data);

		return [schema.name, { ...schema, data: validator }];
	})
);
export type WSSchemas = {
	[K in Events[number] as K["name"]]: {
		data: K["data"]["static"];
		reply: K["reply"] extends undefined
			? never
			: Partial<
					{
						[R in keyof NonNullable<K["reply"]>]: NonNullable<
							K["reply"]
						>[R] extends TSchema
							? (data: Static<NonNullable<K["reply"]>[R]>) => void
							: never;
					} & {
						id: (id: string) => void;
						done: () => void;
						error: (data: string) => void;
					}
				>;
	};
};
export type Client2ServerEvents = ExtractEvents<Events, "client2server">;
export type Server2ClientEvents = ExtractEvents<Events, "server2client"> &
	ReplyEvents<Events>;
export type InterServerEvents = ExtractEvents<Events, "inter">;

export type SocketData = {
	session: Session;
};

export type WSHandler<
	TEvents extends ReadonlyArray<WSSchema<any, any, any, any>>
> = {
	[K in Extract<
		TEvents[number],
		{ type: "client2server" | "inter" }
	> as K["name"]]: (context: {
		id: string;
		socket: Socket<
			Client2ServerEvents,
			Server2ClientEvents,
			InterServerEvents,
			SocketData
		>;
		data: K["data"]["static"];
		reply: K["reply"] extends undefined
			? never
			: ReplyFunction<NonNullable<K["reply"]>>;
	}) => MaybePromise<((id: string) => MaybePromise<void>) | void>;
};

export function onDispose(
	event: keyof Omit<Client2ServerEvents & InterServerEvents, "unsubscribe">,
	handler: (id: string) => MaybePromise<void>
) {
	wsSchemas[event]!.cleanup = handler;
}
