import baseLogger from "@manager/lib/logger";
import { WorkerProto } from "@vlab/grpc";
import { createServer } from "nice-grpc";
import { WorkerServiceImpl } from "./worker";

const _logger = baseLogger.child({ service: "grpc-server" });

export const grpcServer = createServer();
grpcServer.add(WorkerProto.WorkerServiceDefinition, WorkerServiceImpl);

export * from "./monitor";
export * from "./worker";
export default grpcServer;
