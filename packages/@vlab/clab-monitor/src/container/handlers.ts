import type { MaybePromise } from "bun";
import network from "../network";
import type { Context, DockerContainerEvent, NodeInfo } from "../types";
import { extractCredentials, extractManagementIp, formatHealth } from "./utils";

export default {
	start: async (ctx, _, node) => {
		const { docker, logger, emitter, nodes } = ctx;

		const container = docker.getContainer(node.id);
		const info = await container.inspect();
		const health = formatHealth(info.State.Health?.Status);
		const ip = extractManagementIp(info.NetworkSettings);

		if (!ip) {
			logger?.warn(
				`[start] No management IP found for node ${node.id}, skipping`,
			);
			return;
		}

		nodes.add(node.id);
		emitter.emit("node-create", node);
		emitter.emit("health-update", node, health);

		network.start(ctx, {
			container,
			info: node,
			details: { ip, credentials: extractCredentials(info.Config.Env) },
		});
	},
	health_status: ({ emitter }, { Action }, node) => {
		const health = formatHealth(Action.replace("health_status: ", ""));

		emitter.emit("health-update", node, health);
	},
	kill: (ctx, _, node) => {
		const { docker, nodes, logger, emitter } = ctx;
		logger?.debug(`[kill] Handling kill event from ${node.id}`);

		nodes.delete(node.id);
		emitter.emit("node-remove", node);
		network.stop(ctx, {
			container: docker.getContainer(node.id),
			info: node,
			details: { ip: "", credentials: {} }, // not needed for stop
		});
	},
	die: ({ emitter }, _, node) => {
		emitter.emit("health-update", node, "died");
	},
	destroy: ({ emitter }, _, node) => {
		emitter.emit("health-update", node, "destroyed");
	},
} as Record<
	string,
	(
		ctx: Context,
		event: DockerContainerEvent,
		node: NodeInfo,
	) => MaybePromise<void>
>;
