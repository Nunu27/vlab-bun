import deviceWSSchemas from "@backend/routes/device/ws/schema";
import type { Session } from "@backend/types/session";
import type { ExtractEvents, ReplyFunction, WSSchema } from "@backend/types/ws";
import { createWSSchema } from "@backend/utils/ws";
import type { MaybePromise } from "bun";
import { t } from "elysia/type-system";
import { compile } from "elysia/type-system/utils";
import { Socket } from "socket.io";

const schemas = [
	...deviceWSSchemas,
	createWSSchema({
		type: "server2client",
		name: "error",
		data: t.String()
	})
];
export const wsSchemas = Object.fromEntries(
	schemas.map((schema) => {
		const validator = compile(schema.data);

		return [schema.name, { ...schema, data: validator }];
	})
);

type Events = typeof schemas;
type Client2ServerEvents = ExtractEvents<Events, "client2server">;
type Server2ClientEvents = ExtractEvents<Events, "server2client">;
type InterServerEvents = ExtractEvents<Events, "inter">;
type SocketData = {
	session: {
		readonly data: Session;
		readonly extend: () => Promise<void>;
		readonly set: (data: Session) => Promise<void>;
		readonly delete: () => Promise<void>;
	};
};

type WSHandler<TEvents extends ReadonlyArray<WSSchema<any, any, any, any>>> = {
	[K in Extract<
		TEvents[number],
		{ type: "client2server" | "inter" }
	> as K["name"]]: (
		socket: Socket<
			Client2ServerEvents,
			Server2ClientEvents,
			InterServerEvents,
			SocketData
		>,
		data: K["data"]["static"],
		reply: K["reply"] extends undefined
			? never
			: ReplyFunction<NonNullable<K["reply"]>>
	) => MaybePromise<void>;
};

export type {
	Client2ServerEvents,
	InterServerEvents,
	Server2ClientEvents,
	SocketData,
	WSHandler
};
