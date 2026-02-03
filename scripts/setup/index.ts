import { ask } from "../common/input";
import logger from "../common/logger";
import { execute, initShell, isRemote } from "../common/shell";
import { detectArchitecture } from "../common/utils";
import { deployClab } from "./clab";
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

	let config = null;
	let vlabNetwork = "vlab";

	if (isRemote()) {
		config = await gatherAndSetupEnvironment(deployPath);
		vlabNetwork = config.vlabNetwork;
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

	await deployGuacd({ network: vlabNetwork });

	const clabJwtSecretRes = await execute("openssl rand -hex 32");
	const clabJwtSecret = clabJwtSecretRes.stdout.toString().trim();

	await deployClab({
		port: "8080",
		jwtSecret: clabJwtSecret,
		logLevel: "info",
		network: vlabNetwork,
	});

	if (config) {
		await writeEnvFile(config, "guacd", "clab-api-server");
	}

	let privKey = "";
	let sshPort = "22";
	let vpsIp = "unknown";

	if (isRemote()) {
		logger.section("CI/CD Setup");

		const sshKeyPath = "~/.ssh/vlab_deploy";
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
		await execute(`mkdir -p ~/.ssh && chmod 700 ~/.ssh`);
		await execute(`cat "${sshKeyPath}.pub" >> ~/.ssh/authorized_keys`);
		await execute(`chmod 600 ~/.ssh/authorized_keys`);
		logger.success("SSH key ready");

		const privKeyRes = await execute(`cat "${sshKeyPath}"`);
		privKey = privKeyRes.stdout.toString().trim();

		const vpsIpRes = await execute(
			"hostname -I 2>/dev/null | awk '{print $1}' || curl -s ifconfig.me",
		);
		vpsIp = vpsIpRes.stdout.toString().trim();
		const sshPortRes = await execute(
			"grep '^Port' /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}' || echo '22'",
		);
		sshPort = sshPortRes.stdout.toString().trim() || "22";
	}

	logger.success("Setup Complete! 🎉");

	const { raw: arch, platform } = await detectArchitecture();

	if (isRemote()) {
		logger.section("📋 GitHub Secrets");
		logger.info("Settings → Secrets and variables → Actions\n");

		logger.log(`VPS_HOST`);
		logger.log(`  ${vpsIp}\n`);
		logger.log(`VPS_USERNAME`);
		logger.log(`  ${currentUser}\n`);
		logger.log(`VPS_SSH_KEY`);
		logger.log(`  (Private key for SSH access to VPS)`);
		logger.log(privKey);
		logger.log(`\nVPS_PORT`);
		logger.log(`  ${sshPort}\n`);
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
