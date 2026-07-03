import Waycast, {
	type DataRoute,
	type InferOutput,
	type RouteParams,
	type RpcRoute,
} from "waycast";
import { adminRouter } from "./admin";
import { deviceTemplateRouter } from "./device-template";
import { labRouter } from "./lab";
import { labSessionRouter } from "./lab-session";
import type { WSMeta } from "./types";

const appRouter = new Waycast<WSMeta>({ maxDisconnectionDuration: 60000 })
	.merge(adminRouter)
	.merge(deviceTemplateRouter)
	.merge(labSessionRouter)
	.merge(labRouter);

export type AppRouter = typeof appRouter;
export default appRouter;

export type WSRoutes = AppRouter extends Waycast<WSMeta, infer R> ? R : never;

export type WSDataRouteNames = {
	[K in keyof WSRoutes]: WSRoutes[K] extends DataRoute ? K : never;
}[keyof WSRoutes];
export type WSRpcRouteNames = {
	[K in keyof WSRoutes]: WSRoutes[K] extends RpcRoute ? K : never;
}[keyof WSRoutes];

export type WSParamsOf<Name extends string> = RouteParams<Name>;
export type WSDataOf<Name extends WSDataRouteNames & string> = InferOutput<
	Extract<WSRoutes[Name], DataRoute>["schema"]
>;
export type WSRpcPayloadOf<Name extends WSRpcRouteNames & string> = InferOutput<
	Extract<WSRoutes[Name], RpcRoute>["payload"]
>;
export type WSRpcResponseOf<Name extends WSRpcRouteNames & string> =
	InferOutput<Extract<WSRoutes[Name], RpcRoute>["response"]>;
export type WSRpcRepliesOf<Name extends WSRpcRouteNames & string> = Extract<
	WSRoutes[Name],
	RpcRoute
>["replies"];
