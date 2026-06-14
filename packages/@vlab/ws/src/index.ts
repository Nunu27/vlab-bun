import {
	type BuiltInRpcRoutes,
	type DataMessage,
	type InferDataRoutes,
	type InferRpcRoutes,
	type ParamsOf,
	type RequestMessage,
	Router,
	type RpcReplyMessage,
} from "waycast";
import { adminRouter } from "./admin";
import { deviceTemplateRouter } from "./device-template";
import { labSessionRouter } from "./lab-session";
import type { WSMeta } from "./types";

const appRouter = new Router<WSMeta>({ maxDisconnectionDuration: 60000 })
	.merge(adminRouter)
	.merge(deviceTemplateRouter)
	.merge(labSessionRouter);

export type AppRouter = typeof appRouter;
export default appRouter;

export type WSDataRoutes = InferDataRoutes<AppRouter>;
export type WSRpcRoutes = InferRpcRoutes<AppRouter> & BuiltInRpcRoutes;

export type ClientToServerEvents = {
	rpc: (message: RequestMessage<WSRpcRoutes>) => void;
};
export type ServerToClientEvents = {
	data: (message: DataMessage<WSDataRoutes>) => void;
	reply: (message: RpcReplyMessage<WSRpcRoutes>) => void;
};

export type WSParamsOf<T extends string> = ParamsOf<T>;
