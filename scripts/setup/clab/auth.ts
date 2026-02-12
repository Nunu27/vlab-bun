import logger from "../../common/logger";
import { execute } from "../../common/shell";

export async function setupClabUser(username: string, password: string) {
	logger.section("Configuring Containerlab Authentication");

	try {
		// Ensure groups exist
		await execute("sudo groupadd -f clab_admins");
		await execute("sudo groupadd -f clab_api");

		// Check if user exists
		const userExists = await execute(
			`id -u ${username} >/dev/null 2>&1 && echo yes || echo no`,
		);

		if (userExists.stdout.toString().trim() !== "yes") {
			logger.info(`Creating new linux user: ${username}`);
			// Create user with no login shell and member of clab_admins and clab_api
			await execute(
				`sudo useradd -m -s /usr/sbin/nologin -G clab_admins,clab_api ${username}`,
			);
		} else {
			logger.info(`Adding existing user ${username} to clab groups`);
			await execute(`sudo usermod -aG clab_admins,clab_api ${username}`);
		}

		// Set the password
		logger.info(`Setting password for ${username}`);
		await execute(`echo "${username}:${password}" | sudo chpasswd`);

		logger.success(
			`User ${username} configured for containerlab API server successfully!`,
		);
	} catch (error) {
		logger.error(
			`Failed to configure user for containerlab API server: ${error}`,
		);
	}
}
