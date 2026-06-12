import type {
	DataMessage,
	InferDataRoutes,
	InferRpcRoutes,
	RequestMessage,
	RpcReplyMessage,
} from "waycast";
import type { AppRouter } from "./commands";

export type GrpcDataRoutes = InferDataRoutes<AppRouter>;
export type GrpcRpcRoutes = InferRpcRoutes<AppRouter>;
export type GrpcDataMessage = DataMessage<GrpcDataRoutes>;
export type GrpcRpcReplyMessage = RpcReplyMessage<GrpcRpcRoutes>;
export type GrpcRequestMessage = RequestMessage<GrpcRpcRoutes>;
export * from "./async-queue";
export * from "./commands";
export * as GoogleProto from "./google/protobuf/empty";
export * as WorkerProto from "./worker";
