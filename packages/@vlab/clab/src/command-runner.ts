import { ContainerlabCliNotFoundError } from "./errors";

export interface ContainerlabCommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export type ContainerlabCommandRunner = (
	command: string,
	args: readonly string[],
) => Promise<ContainerlabCommandResult>;

export async function commandRunner(
	command: string,
	args: readonly string[],
): Promise<ContainerlabCommandResult> {
	try {
		const process = Bun.spawn([command, ...args], {
			stderr: "pipe",
			stdout: "pipe",
		});

		const [exitCode, stdout, stderr] = await Promise.all([
			process.exited,
			new Response(process.stdout).text(),
			new Response(process.stderr).text(),
		]);

		return { exitCode, stdout, stderr };
	} catch (error) {
		throw new ContainerlabCliNotFoundError(command, error);
	}
}
