import { $ } from "bun";
import colors from "./colors";
import { ask, confirm } from "./input";
import { error, info, log, section, success, warn } from "./logger";

interface ShellConfig {
	remote: boolean;
	username?: string;
	host?: string;
	port?: string;
	privateKey?: string;
	password?: string;
}

let config: ShellConfig | null = null;

export async function initShell(): Promise<void> {
	section("Shell Configuration");

	let isValid = false;

	while (!isValid) {
		const runRemote = await confirm("Run on a remote machine?", false);

		if (runRemote) {
			const username = await ask("SSH Username:", "root");
			let host = await ask("SSH Host/IP:");

			while (!host) {
				error("Host is required for remote execution.");
				host = await ask("SSH Host/IP:");
			}

			const port = await ask("SSH Port:", "22");

			const privateKey = await ask("SSH Private Key path:");

			let password = "";
			if (!privateKey) {
				password = await ask("SSH Password:");

				if (password) {
					// Check if sshpass is installed using Bun's shell
					const { exitCode } = await $`command -v sshpass`.quiet().nothrow();
					if (exitCode !== 0) {
						warn("'sshpass' is not installed!");
						log(
							`${colors.gray}We cannot automatically pass the password without it. Please install it:${colors.reset}`,
						);
						log(`${colors.gray}  - Mac: brew install sshpass${colors.reset}`);
						log(
							`${colors.gray}  - Ubuntu/Debian: sudo apt install sshpass${colors.reset}`,
						);
						log(
							`${colors.gray}Falling back to interactive password prompt...${colors.reset}\n`,
						);
						password = "";
					}
				}
			}

			config = {
				remote: true,
				username,
				host,
				port,
				...(privateKey && { privateKey }),
				...(password && { password }),
			};

			info(`Verifying connection to ${username}@${host}:${port}...`);

			let testResult: $.ShellOutput | undefined;
			if (privateKey) {
				testResult =
					await $`ssh -p ${port} -o ConnectTimeout=5 -i ${privateKey} ${username}@${host} exit`
						.quiet()
						.nothrow();
			} else if (password) {
				testResult =
					await $`sshpass -p ${password} ssh -p ${port} -o ConnectTimeout=5 ${username}@${host} exit`
						.quiet()
						.nothrow();
			} else {
				testResult =
					await $`ssh -p ${port} -o ConnectTimeout=5 ${username}@${host} exit`.nothrow();
			}

			if (testResult.exitCode === 0) {
				const authMethod = privateKey
					? `(Key: ${privateKey})`
					: password
						? `(Password saved)`
						: `(Interactive Auth)`;
				success(
					`Remote connection verified for ${username}@${host}:${port} ${authMethod}`,
				);
				isValid = true;
			} else {
				error(
					`Connection verification failed (Exit Code: ${testResult.exitCode}). Please check your credentials and try again.\n`,
				);
				config = null;
			}
		} else {
			config = { remote: false };
			info("Continuing locally...");
			isValid = true;
		}
	}
}

export async function execute(command: string, options = { quiet: true }) {
	if (!config) {
		await initShell();
	}

	let result: ReturnType<typeof $>;
	if (config?.remote) {
		if (config.privateKey) {
			result = $`ssh -p ${config.port} -i ${config.privateKey} ${config.username}@${config.host} ${command}`;
		} else if (config.password) {
			result = $`sshpass -p ${config.password} ssh -p ${config.port} ${config.username}@${config.host} ${command}`;
		} else {
			result = $`ssh -p ${config.port} ${config.username}@${config.host} ${command}`;
		}
	} else {
		result = $`sh -c ${command}`;
	}

	if (options.quiet) {
		return await result.quiet();
	}
	return await result;
}

export function resetShell(): void {
	config = null;
}

export function isRemote(): boolean {
	return config?.remote ?? false;
}

export default {
	initShell,
	execute,
	resetShell,
	isRemote,
};
