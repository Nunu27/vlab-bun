import type { RpcServer } from "../transport";
import { registerClabHandlers } from "./clab";
import { registerDockerHandlers } from "./docker";
import { registerEvaluatorHandlers } from "./evaluator";

export function registerAllHandlers(server: RpcServer) {
	registerClabHandlers(server);
	registerEvaluatorHandlers(server);
	registerDockerHandlers(server);
}
