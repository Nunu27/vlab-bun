import logger from "../common/logger";
import { execute } from "../common/shell";

export async function installPrerequisites(currentUser: string) {
	logger.section("Prerequisites (Docker & Git)");

	const hasDocker = await execute(
		"command -v docker >/dev/null 2>&1 && echo yes || echo no",
	);
	if (hasDocker.stdout.toString().trim() === "yes") {
		const dockerVersion = await execute("docker --version");
		logger.info(
			`Docker already installed (${dockerVersion.stdout.toString().trim()})`,
		);
	} else {
		logger.info("Installing Docker...");
		await execute("curl -fsSL https://get.docker.com -o get-docker.sh");
		await execute("sudo sh get-docker.sh");
		await execute("rm get-docker.sh");

		logger.info("Adding user to docker group...");
		await execute(`sudo usermod -aG docker "${currentUser}"`);

		logger.info("Docker installed");
		logger.warn("Log out and back in for docker group changes");
	}

	const hasGit = await execute(
		"command -v git >/dev/null 2>&1 && echo yes || echo no",
	);
	if (hasGit.stdout.toString().trim() !== "yes") {
		logger.info("Installing git...");
		const hasApt = await execute(
			"command -v apt-get >/dev/null 2>&1 && echo yes || echo no",
		);
		const hasYum = await execute(
			"command -v yum >/dev/null 2>&1 && echo yes || echo no",
		);
		const hasDnf = await execute(
			"command -v dnf >/dev/null 2>&1 && echo yes || echo no",
		);
		const hasPacman = await execute(
			"command -v pacman >/dev/null 2>&1 && echo yes || echo no",
		);

		if (hasApt.stdout.toString().trim() === "yes") {
			await execute("sudo apt-get update && sudo apt-get install -y git");
		} else if (hasYum.stdout.toString().trim() === "yes") {
			await execute("sudo yum install -y git");
		} else if (hasDnf.stdout.toString().trim() === "yes") {
			await execute("sudo dnf install -y git");
		} else if (hasPacman.stdout.toString().trim() === "yes") {
			await execute("sudo pacman -S --noconfirm git");
		} else {
			logger.warn(
				"Could not install git automatically. Please install it manually.",
			);
		}

		const checkGitAgain = await execute(
			"command -v git >/dev/null 2>&1 && echo yes || echo no",
		);
		if (checkGitAgain.stdout.toString().trim() === "yes") {
			logger.success("git installed");
		}
	} else {
		logger.info("git already installed");
	}
}
