import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { buildDeployArgs, buildDestroyArgs } from "./args";
import {
	type ContainerlabCommandRunner,
	commandRunner,
} from "./command-runner";
import { ContainerlabCommandError } from "./errors";
import { parseInspectOutput } from "./inspect";
import { validateLabId } from "./lab-id";
import type {
	ContainerlabInspectNode,
	ContainerlabOptions,
	ContainerlabTopologyDefinition,
	DeployOptions,
	DestroyOptions,
} from "./types";

export class Containerlab {
	readonly topologiesPath: string;
	readonly cliPath: string;

	#commandRunner: ContainerlabCommandRunner;
	#ready = false;
	#readyPromise?: Promise<void>;

	constructor(options: ContainerlabOptions) {
		this.topologiesPath = resolve(options.topologiesPath);
		this.cliPath = options.cliPath ?? "containerlab";
		this.#commandRunner = commandRunner;
	}

	async ready() {
		if (this.#ready) return;

		this.#readyPromise ??= this.#run(["version"])
			.then(() => {
				this.#ready = true;
			})
			.catch((error) => {
				this.#readyPromise = undefined;
				throw error;
			});

		await this.#readyPromise;
	}

	async deploy(
		id: string,
		config: ContainerlabTopologyDefinition,
		options: DeployOptions = {},
	) {
		const topologyPath = this.#getTopologyPath(id);

		await this.ready();
		await this.#writeTopology(id, config);

		await this.#run([
			"deploy",
			"--topo",
			topologyPath,
			...buildDeployArgs(options),
		]);

		return this.inspect(id);
	}

	async destroy(id: string, options: DestroyOptions = {}) {
		const labDirectory = this.#getLabDirectory(id);
		const topologyPath = this.#getTopologyPath(id);

		await this.ready();
		await this.#run([
			"destroy",
			"--topo",
			topologyPath,
			"--keep-mgmt-net",
			"--cleanup",
			...buildDestroyArgs(options),
		]);
		await rm(labDirectory, { recursive: true, force: true });
	}

	async inspect(id: string): Promise<ContainerlabInspectNode[]> {
		const topologyPath = this.#getTopologyPath(id);

		await this.ready();

		const result = await this.#run([
			"inspect",
			"--topo",
			topologyPath,
			"--format",
			"json",
		]);

		return parseInspectOutput(result.stdout);
	}

	async #writeTopology(id: string, config: ContainerlabTopologyDefinition) {
		const labDirectory = this.#getLabDirectory(id);
		const topologyPath = this.#getTopologyPath(id);
		const topology: ContainerlabTopologyDefinition = {
			...config,
			name: id,
		};

		await mkdir(labDirectory, { recursive: true });
		await Bun.write(topologyPath, `${Bun.YAML.stringify(topology)}\n`);
	}

	#getLabDirectory(id: string) {
		validateLabId(id);
		return resolve(this.topologiesPath, id);
	}

	#getTopologyPath(id: string) {
		return resolve(this.#getLabDirectory(id), `${id}.clab.yml`);
	}

	async #run(args: readonly string[]) {
		const result = await this.#commandRunner(this.cliPath, args);
		if (result.exitCode !== 0) {
			throw new ContainerlabCommandError(this.cliPath, args, result);
		}
		return result;
	}
}
