import { PassThrough } from "node:stream";
import type Docker from "dockerode";
import type { RouterOSClient } from "mikro-routeros";
import type { DeployedNode } from "./context";
import {
	type SolutionCommand,
	toRouterOSCall,
	toShellCommand,
} from "./solution-parser";

export interface SolutionRunFailure {
	node: string;
	command: string;
	line: number;
	reason: string;
}

/**
 * Runs a shell command and fails on a non-zero exit code.
 *
 * Detach:false waits for the command to finish before returning, preventing
 * race conditions (e.g. ip route add running before ip addr add completes).
 */
async function execInContainer(
	docker: Docker,
	containerId: string,
	command: string,
): Promise<{ exitCode: number; output: string }> {
	const container = docker.getContainer(containerId);
	const exec = await container.exec({
		Cmd: ["sh", "-c", command],
		AttachStdout: true,
		AttachStderr: true,
		Tty: false,
	});

	const stream = await exec.start({ Detach: false, Tty: false });

	const stdout = new PassThrough();
	const stderr = new PassThrough();
	container.modem.demuxStream(stream, stdout, stderr);

	let output = "";
	stdout.on("data", (chunk: Buffer) => {
		output += chunk.toString();
	});
	stderr.on("data", (chunk: Buffer) => {
		output += chunk.toString();
	});

	await new Promise<void>((resolve, reject) => {
		stream.on("end", resolve);
		stream.on("error", reject);
		stream.resume();
	});

	const { ExitCode } = await exec.inspect();
	return { exitCode: ExitCode ?? 0, output: output.trim() };
}

/**
 * Executes a module's solution.md against a deployed topology, in document
 * order, and reports every command that failed.
 *
 * Failures are collected rather than thrown so one bad command does not mask
 * the rest of the solution: a drifted module usually has more than one.
 * Read-only commands are skipped — the suite asserts state through the
 * evaluator's checks, not through command output.
 */
export async function runSolution(
	commands: SolutionCommand[],
	mikrotikClients: Record<string, RouterOSClient>,
	docker: Docker,
	nodeMap: Record<string, DeployedNode>,
): Promise<SolutionRunFailure[]> {
	const failures: SolutionRunFailure[] = [];

	for (const command of commands) {
		if (command.readOnly) continue;

		const fail = (reason: string) =>
			failures.push({
				node: command.node,
				command: command.raw,
				line: command.line,
				reason,
			});

		try {
			if (command.kind === "routeros") {
				const client = mikrotikClients[command.node];
				if (!client) {
					fail(`no RouterOS client for node ${command.node}`);
					continue;
				}

				const { path, params } = toRouterOSCall(command.raw);
				await client.runQuery(path, params);
				continue;
			}

			const node = nodeMap[command.node];
			if (!node) {
				fail(`node ${command.node} is not in the deployed topology`);
				continue;
			}

			const { exitCode, output } = await execInContainer(
				docker,
				node.containerId,
				toShellCommand(command.raw),
			);
			if (exitCode !== 0) {
				fail(`exited ${exitCode}: ${output || "(no output)"}`);
			}
		} catch (error) {
			fail(error instanceof Error ? error.message : String(error));
		}
	}

	return failures;
}

export function formatFailures(failures: SolutionRunFailure[]): string {
	return failures
		.map(
			(f) =>
				`  solution.md:${f.line} [${f.node}] ${f.command}\n    -> ${f.reason}`,
		)
		.join("\n");
}
