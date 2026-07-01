import { homedir } from "node:os";
import {
	cancel,
	intro,
	isCancel,
	outro,
	password,
	select,
	spinner,
	text,
} from "@clack/prompts";
import { NodeSSH } from "node-ssh";

async function main() {
	intro("vLab Remote Command Execution");

	const host = await text({
		message: "Enter the remote host (e.g. 192.168.1.100 or manager.vlab.local)",
		validate(value) {
			if (!value) return "Host is required";
		},
	});
	if (isCancel(host)) {
		cancel("Operation cancelled");
		process.exit(0);
	}

	const portStr = await text({
		message: "Enter the SSH port",
		initialValue: "22",
	});
	if (isCancel(portStr)) {
		cancel("Operation cancelled");
		process.exit(0);
	}

	const username = await text({
		message: "Enter the SSH username",
		validate(value) {
			if (!value) return "Username is required";
		},
	});
	if (isCancel(username)) {
		cancel("Operation cancelled");
		process.exit(0);
	}

	const authMethod = await select({
		message: "Select authentication method",
		options: [
			{ value: "key", label: "Private Key (Default ~/.ssh/id_rsa)" },
			{ value: "password", label: "Password" },
			{ value: "none", label: "None / SSH Agent" },
		],
	});
	if (isCancel(authMethod)) {
		cancel("Operation cancelled");
		process.exit(0);
	}

	// biome-ignore lint/suspicious/noExplicitAny: SSH config payload varies
	const authConfig: any = {
		host: host as string,
		port: Number.parseInt(portStr as string, 10),
		username: username as string,
	};

	if (authMethod === "password") {
		const pwd = await password({ message: "Enter SSH password" });
		if (isCancel(pwd)) {
			cancel("Operation cancelled");
			process.exit(0);
		}
		authConfig.password = pwd as string;
	} else if (authMethod === "key") {
		const keyPath = await text({
			message: "Enter path to private key",
			initialValue: `${homedir()}/.ssh/id_rsa`,
		});
		if (isCancel(keyPath)) {
			cancel("Operation cancelled");
			process.exit(0);
		}
		authConfig.privateKey = await Bun.file(keyPath as string).text();
	}

	const ssh = new NodeSSH();
	const s = spinner();
	s.start("Connecting to remote host...");
	try {
		await ssh.connect(authConfig);
		s.stop("Connected successfully");
	} catch (e) {
		s.stop("Failed to connect");
		console.error(e);
		process.exit(1);
	}

	s.start("Discovering manager containers...");
	const dockerPs = await ssh.execCommand(
		`docker ps --format "{{.ID}}|{{.Names}}|{{.Image}}"`,
	);
	s.stop("Containers discovered");

	if (dockerPs.code !== 0) {
		console.error("Failed to list containers:", dockerPs.stderr);
		process.exit(1);
	}

	const containers = dockerPs.stdout
		.split("\n")
		.filter((line) => line.includes("manager")) // Simple filter for manager image/name
		.map((line) => {
			const [id, names, image] = line.split("|");
			return { value: id, label: `${names} (${image})` };
		});

	if (containers.length === 0) {
		console.error("No manager containers found on the remote host.");
		process.exit(1);
	}

	const selectedContainer = await select({
		message: "Select the target container",
		options: containers,
	});
	if (isCancel(selectedContainer)) {
		cancel("Operation cancelled");
		process.exit(0);
	}

	const commandToRun = await text({
		message:
			"Enter the command to run on the manager (e.g. clear-sessions 2210191001)",
		validate(value) {
			if (!value) return "Command is required";
		},
	});
	if (isCancel(commandToRun)) {
		cancel("Operation cancelled");
		process.exit(0);
	}

	s.start(`Executing command: ${commandToRun}...`);
	try {
		const execCmd = await ssh.execCommand(
			`docker exec ${selectedContainer} /app/app ${commandToRun}`,
		);

		s.stop("Command execution complete");
		if (execCmd.stdout) {
			console.log(execCmd.stdout);
		}
		if (execCmd.stderr) {
			console.error(execCmd.stderr);
		}
	} catch (e) {
		s.stop("Command execution failed");
		console.error(e);
	} finally {
		ssh.dispose();
	}

	outro("Operation finished!");
}

main().catch(console.error);
