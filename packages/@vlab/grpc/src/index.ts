import type { InferOutput, RpcCallbacks, RpcRoute, Waycast } from "waycast";
import type { AppRouter } from "./commands";

export type GrpcRoutes =
	AppRouter extends Waycast<unknown, infer R> ? R : never;
export type GrpcRpcRoute<K extends keyof GrpcRoutes> = Extract<
	GrpcRoutes[K],
	RpcRoute
>;
export type GrpcRpcPayloadOf<K extends keyof GrpcRoutes> = InferOutput<
	GrpcRpcRoute<K>["payload"]
>;
export type GrpcRpcResponseOf<K extends keyof GrpcRoutes> = InferOutput<
	GrpcRpcRoute<K>["response"]
>;
export type GrpcRpcCallbacks<K extends keyof GrpcRoutes> = RpcCallbacks<
	GrpcRpcRoute<K>["replies"],
	GrpcRpcRoute<K>["response"]
>;
export * from "./async-queue";
export * from "./codec";
export * from "./commands";
export * as GoogleProto from "./google/protobuf/empty";
export * as WorkerProto from "./worker";
