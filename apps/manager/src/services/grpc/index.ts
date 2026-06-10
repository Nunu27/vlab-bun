import { WorkerProto } from "@vlab/grpc";
import { createServer } from "nice-grpc";
import { WorkerServiceImpl } from "./handlers";

export const grpcServer = createServer();
grpcServer.add(WorkerProto.WorkerServiceDefinition, WorkerServiceImpl);

export * from "./handlers";
export default grpcServer;
