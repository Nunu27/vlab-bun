import { ask, askPassword, confirm } from "../common/input";
import logger from "../common/logger";
import { execute, getConfig, initShell, isRemote } from "../common/shell";
import { detectArchitecture } from "../common/utils";
import { deployClab } from "./clab";
import { setupClabUser } from "./clab/auth";
import { gatherAndSetupEnvironment, writeEnvFile } from "./env";
import { deployGuacd } from "./guacamole";
import { installPrerequisites } from "./install";

async function main() {
	logger.banner("vLab Setup");

	await initShell();

	const currentHostnameRes = await execute(
		"hostname 2>/dev/null || cat /etc/hostname 2>/dev/null || echo 'unknown'",
	);
	const currentUserRes = await execute("whoami");
	const currentIpRes = await execute(
		"hostname -I 2>/dev/null | awk '{print $1}' || echo 'unknown'",
	);

	logger.log(
		`Machine: ${currentUserRes.stdout.toString().trim()}@${currentHostnameRes.stdout.toString().trim()} (${currentIpRes.stdout.toString().trim()})\n`,
	);

	// Check root/sudo if running locally
	const checkRoot = await execute("id -u");
	if (checkRoot.stdout.toString().trim() === "0") {
		logger.error(
			"Don't run as root locally. Use a regular user with sudo privileges.",
		);
		process.exit(1);
	}

	const currentUser = currentUserRes.stdout.toString().trim();
	await installPrerequisites(currentUser);

	let deployPath = process.cwd();

	if (isRemote()) {
		logger.section("Deploy Directory");
		deployPath = await ask("Enter deployment directory path", "/opt/vlab");

		logger.info(`Creating deployment directory: ${deployPath}`);
		await execute(`sudo mkdir -p "${deployPath}"`);
		await execute(`sudo chown "$USER:$USER" "${deployPath}"`);
		logger.success("Deployment directory ready");
	}

	const config = isRemote()
		? await gatherAndSetupEnvironment(deployPath)
		: null;
	const vlabNetwork = config?.vlabNetwork ?? "vlab";

	if (config) {
		await writeEnvFile(config, "guacd", "clab-api-server");
	} else {
		// Just ensure local vlab network exists
		const netCheck = await execute(
			`docker network inspect "${vlabNetwork}" >/dev/null 2>&1 && echo yes || echo no`,
		);
		if (netCheck.stdout.toString().trim() === "no") {
			logger.info(`Creating missing local network: ${vlabNetwork}`);
			await execute(`docker network create "${vlabNetwork}"`);
		}
	}

	// Ensure clab network exists to prevent overlap issues
	const clabNetCheck = await execute(
		`docker network inspect clab >/dev/null 2>&1 && echo yes || echo no`,
	);
	if (clabNetCheck.stdout.toString().trim() === "no") {
		logger.info(`Creating non-conflicting clab network`);
		await execute(
			`docker network create clab --subnet=172.31.20.0/24 --subnet=3fff:172:31:20::/64 --ipv6`,
		);
	}

	await deployGuacd({ networks: [vlabNetwork, "clab"] });

	logger.section("Containerlab API Authentication");
	const setupAuth = await confirm(
		"Do you want to create an admin account for the clab-api-server?",
		true,
	);
	if (setupAuth) {
		const clabUsername = await ask(
			"Username for clab-api-server admin",
			"admin",
		);
		const clabPassword = await askPassword(
			"Password for clab-api-server admin",
		);
		await setupClabUser(clabUsername, clabPassword);
	}

	const clabJwtSecretRes = await execute("openssl rand -hex 32");
	const clabJwtSecret = clabJwtSecretRes.stdout.toString().trim();

	await deployClab({
		port: "8080",
		jwtSecret: clabJwtSecret,
		logLevel: "info",
		network: vlabNetwork,
	});

	let privKey = "";

	if (isRemote()) {
		logger.section("CI/CD Setup");

		const sshKeyPath = "$HOME/.ssh/vlab_deploy";
		const keyExists = await execute(
			`test -f "${sshKeyPath}" && echo yes || echo no`,
		);

		if (keyExists.stdout.toString().trim() === "yes") {
			logger.info("SSH key already exists");
		} else {
			logger.info("Creating SSH key...");
			await execute(
				`ssh-keygen -t ed25519 -f "${sshKeyPath}" -N "" -C "vlab-github-actions"`,
			);
		}

		logger.info("Adding to authorized_keys...");
		await execute(`mkdir -p $HOME/.ssh && chmod 700 $HOME/.ssh`);
		await execute(
			`grep -qsFf "${sshKeyPath}.pub" $HOME/.ssh/authorized_keys || cat "${sshKeyPath}.pub" >> $HOME/.ssh/authorized_keys`,
		);
		await execute(`chmod 600 $HOME/.ssh/authorized_keys`);
		logger.success("SSH key ready");

		const privKeyRes = await execute(`cat "${sshKeyPath}"`);
		privKey = privKeyRes.stdout.toString().trim();
	}

	logger.success("Setup Complete! 🎉");

	const { raw: arch, platform } = await detectArchitecture();

	const shellConfig = getConfig();
	if (isRemote() && shellConfig) {
		logger.section("📋 GitHub Secrets");
		logger.info("Settings → Secrets and variables → Actions\n");

		logger.log(`VPS_HOST`);
		logger.log(`  ${shellConfig.host}\n`);
		logger.log(`VPS_USERNAME`);
		logger.log(`  ${currentUser}\n`);
		logger.log(`VPS_SSH_KEY`);
		logger.log(privKey);
		logger.log(`\nVPS_PORT`);
		logger.log(`  ${shellConfig.port}\n`);
		logger.log(`VPS_DEPLOY_PATH`);
		logger.log(`  ${deployPath}\n`);

		logger.section("📋 GitHub Variables");
		logger.log(`DOCKER_PLATFORMS`);
		logger.log(`  ${platform} (detected: ${arch})\n`);
	}

	logger.section("📝 Summary");
	logger.log(`Deploy: ${deployPath}`);
	logger.log(`Architecture: ${arch}`);
	if (config) {
		logger.log(`Networks: ${config.networks.join(",")},${config.vlabNetwork}`);
		logger.log(`Database: ${config.dbUrl.replace(/:[^:@]+@/, "@")}`);
		logger.log(`Redis: ${config.redisUrl.replace(/:[^:@]+@/, "@")}`);
	}
	logger.log(`Guacd: guacd:4822 (container)`);
	logger.log(`Containerlab API: clab-api-server:8080 (container)`);

	if (config) {
		logger.log(`URL: ${config.baseUrl}`);
		if (config.bindPort) logger.log(`Port: ${config.bindPort}:3000`);
		if (config.virtualHost) logger.log(`VHost: ${config.virtualHost}`);
	}

	if (config?.useNginxProxy) {
		logger.warn("Note: Ensure nginx-proxy is running before deployment");
	}
}

main().catch((err) => {
	logger.error(`Unexpected error: ${err.message ?? err}`);
	process.exit(1);
});
