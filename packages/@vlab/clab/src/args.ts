import type { DeployOptions, DestroyOptions } from "./types";

export function buildDeployArgs(options: DeployOptions) {
	const args: string[] = [];

	if (options.reconfigure) args.push("--reconfigure");
	if (options.maxWorkers !== undefined) {
		args.push("--max-workers", String(options.maxWorkers));
	}
	if (options.runtime) args.push("--runtime", options.runtime);
	if (options.timeout) args.push("--timeout", options.timeout);
	if (options.logLevel) args.push("--log-level", options.logLevel);
	if (options.nodeFilter) {
		args.push("--node-filter", normalizeListOption(options.nodeFilter));
	}
	if (options.skipPostDeploy) args.push("--skip-post-deploy");
	if (options.skipLabdirAcl) args.push("--skip-labdir-acl");
	if (options.owner) args.push("--owner", options.owner);

	return args;
}

export function buildDestroyArgs(options: DestroyOptions) {
	const args: string[] = [];

	if (options.graceful) args.push("--graceful");
	if (options.nodeFilter) {
		args.push("--node-filter", normalizeListOption(options.nodeFilter));
	}

	return args;
}

function normalizeListOption(value: string | readonly string[]) {
	return typeof value === "string" ? value : value.join(",");
}
