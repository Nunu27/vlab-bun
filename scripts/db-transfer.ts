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
import { $ } from "bun";
import { NodeSSH } from "node-ssh";

async function main() {
	intro("vLab Database Transfer Tool");

	const s = spinner();
	s.start("Generating local backup...");
	try {
		await $`bun run --cwd apps/manager backup`.quiet();
		s.stop("Local backup generated successfully");
	} catch (e) {
		s.stop("Local backup failed");
		console.error(e);
		process.exit(1);
	}

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
		message: "Select the target container for restore",
		options: containers,
	});
	if (isCancel(selectedContainer)) {
		cancel("Operation cancelled");
		process.exit(0);
	}

	s.start("Compressing backup locally...");
	try {
		// Tar the lab_backup directory relative to apps/manager
		await $`tar -czf apps/manager/lab_backup.tar.gz -C apps/manager lab_backup`.quiet();
		s.stop("Backup compressed successfully");
	} catch (e) {
		s.stop("Compression failed");
		console.error(e);
		process.exit(1);
	}

	s.start("Transferring backup to remote host...");
	try {
		await ssh.putFile(
			"apps/manager/lab_backup.tar.gz",
			"/tmp/lab_backup.tar.gz",
		);
		s.stop("Transfer complete");
	} catch (e) {
		s.stop("Transfer failed");
		console.error(e);
		process.exit(1);
	}

	s.start("Extracting and restoring on remote host...");
	try {
		// Extract
		const extractCmd = await ssh.execCommand(
			"tar -xzf /tmp/lab_backup.tar.gz -C /tmp",
		);
		if (extractCmd.code !== 0) throw new Error(extractCmd.stderr);

		// Copy to container. Distroless has no shell, but docker cp works from host.
		const cpCmd = await ssh.execCommand(
			`docker cp /tmp/lab_backup ${selectedContainer}:/app/lab_backup`,
		);
		if (cpCmd.code !== 0) throw new Error(cpCmd.stderr);

		// Execute restore via the compiled binary
		const restoreCmd = await ssh.execCommand(
			`docker exec ${selectedContainer} /app/app restore`,
		);
		if (restoreCmd.code !== 0) throw new Error(restoreCmd.stderr);

		s.stop("Restore complete!");
		console.log(restoreCmd.stdout);
	} catch (e) {
		s.stop("Restore failed");
		console.error(e);
	} finally {
		// Cleanup
		s.start("Cleaning up temporary files...");
		await ssh.execCommand("rm -rf /tmp/lab_backup /tmp/lab_backup.tar.gz");
		await $`rm -f apps/manager/lab_backup.tar.gz`.quiet();
		s.stop("Cleanup complete");
		ssh.dispose();
	}

	outro("Database transfer finished successfully!");
}

main().catch(console.error);
