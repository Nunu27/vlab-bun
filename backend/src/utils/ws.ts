import { WSSchema, WSEventType } from "@backend/types/ws";
import { TSchema } from "elysia";
import { TProperties } from "typebox/type";

export const createWSSchema = <
	TName extends string,
	TType extends WSEventType,
	TData extends TSchema = TSchema,
	TReply extends TProperties = never
>(
	config: WSSchema<TName, TType, TData, TReply>
) => config;
