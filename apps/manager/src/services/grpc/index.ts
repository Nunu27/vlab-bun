import { MonitorProto, WorkerProto } from "@vlab/grpc";
import { createServer } from "nice-grpc";
import { MonitorServiceImpl } from "./monitor";
import { WorkerServiceImpl } from "./worker";

const grpcServer = createServer();

grpcServer.add(MonitorProto.MonitorServiceDefinition, MonitorServiceImpl);
grpcServer.add(WorkerProto.WorkerServiceDefinition, WorkerServiceImpl);

export * from "./monitor";
export * from "./worker";
export default grpcServer;
