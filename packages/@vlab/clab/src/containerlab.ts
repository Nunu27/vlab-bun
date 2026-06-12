import { constants } from "node:fs";
import { access, mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { buildDeployArgs, buildDestroyArgs } from "./args";
import {
	type ContainerlabCommandRunner,
	commandRunner,
} from "./command-runner";
import {
	ContainerlabCliNotFoundError,
	ContainerlabCommandError,
} from "./errors";
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

	async checkPrerequisites(): Promise<void> {
		try {
			await this.#run(["version"]);
		} catch (error) {
			if (error instanceof ContainerlabCliNotFoundError) {
				throw new Error(
					`Containerlab CLI not found at '${this.cliPath}'. Please ensure it is installed and accessible.`,
					{ cause: error },
				);
			}
			throw new Error(
				`Failed to execute Containerlab CLI. Details: ${error instanceof Error ? error.message : error}`,
				{ cause: error },
			);
		}

		try {
			const resolvedPath = Bun.which(this.cliPath) ?? this.cliPath;
			const stats = await stat(resolvedPath);
			const isRoot = process.geteuid?.() === 0;
			const isSuidRoot = (stats.mode & 0o4000) !== 0 && stats.uid === 0;

			if (!isRoot && !isSuidRoot) {
				throw new Error(
					`Containerlab requires root privileges. Please run the worker as root, or grant the executable root SUID permissions.\nTo grant SUID, run exactly: 'sudo chown root:root ${resolvedPath} && sudo chmod u+s ${resolvedPath}' (do not change 'root:root' to your username).`,
				);
			}
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.includes("Containerlab requires root")
			) {
				throw error;
			}
			// Ignore stat failures (e.g., symlink resolution issues) if version check already passed
		}

		try {
			await mkdir(this.topologiesPath, { recursive: true });
			await access(this.topologiesPath, constants.R_OK | constants.W_OK);
		} catch (error) {
			throw new Error(
				`Cannot access or create topologies directory at '${this.topologiesPath}'. Please check permissions. Details: ${error instanceof Error ? error.message : error}`,
				{ cause: error },
			);
		}
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
