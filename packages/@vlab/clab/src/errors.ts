import type { ContainerlabCommandResult } from "./command-runner";

export class ContainerlabCliNotFoundError extends Error {
	constructor(cliPath: string, cause?: unknown) {
		super(`Containerlab CLI not found: ${cliPath}`);
		this.name = "ContainerlabCliNotFoundError";
		this.cause = cause;
	}
}

export class ContainerlabCommandError extends Error {
	readonly command: string;
	readonly args: readonly string[];
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;

	constructor(
		command: string,
		args: readonly string[],
		result: ContainerlabCommandResult,
	) {
		super(
			`Containerlab command failed (${result.exitCode}): ${[
				command,
				...args,
			].join(" ")}`,
		);
		this.name = "ContainerlabCommandError";
		this.command = command;
		this.args = args;
		this.exitCode = result.exitCode;
		this.stdout = result.stdout;
		this.stderr = result.stderr;
	}
}

export class InvalidLabIdError extends Error {
	constructor(id: string) {
		super(`Invalid lab id: ${id}`);
		this.name = "InvalidLabIdError";
	}
}
