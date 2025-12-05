import type { WSSchema, WSEventType } from "@backend/types/ws";
import type { TSchema } from "elysia";
import type { TProperties } from "typebox/type";

export const createWSSchema = <
	TName extends string,
	TType extends WSEventType,
	TData extends TSchema = TSchema,
	TReply extends TProperties = never
>(
	config: WSSchema<TName, TType, TData, TReply>
) => config;
