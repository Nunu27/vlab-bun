import { t } from "elysia";
import {
	createWSSchema,
	type ReplyData,
	type WSSchema,
	type ReplyEvents
} from "./types/ws";
import { deviceWSSchemas } from "./schemas/device";

type DeviceSchemas = typeof deviceWSSchemas;
type FirstSchema = DeviceSchemas[0];
type Reply = FirstSchema["reply"];

// Check if Reply has keys
type Keys = keyof NonNullable<Reply>;

// Check ReplyData
type RData = ReplyData<NonNullable<Reply>>;

// Check ReplyEvents
type REvents = ReplyEvents<DeviceSchemas>;
type DeviceReplyEvent = REvents["device/test/reply"];
const dre: never = {} as Parameters<DeviceReplyEvent>[0];

const k: never = {} as Keys;
const r: never = {} as RData;

const k2: Keys = "message";
const r2: RData = { type: "message", data: "hello" };

type MessageData = Extract<RData, { type: "message" }>;
const m: never = {} as MessageData;
