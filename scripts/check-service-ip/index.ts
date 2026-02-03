import logger from "../common/logger";
import { execute, initShell } from "../common/shell";

const GUACD_CONTAINER = "guacd";
const CLAB_API_SERVER_CONTAINER = "clab-api-server";

async function getContainerIp(containerName: string) {
	const ipRes = await execute(
		`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${containerName}`,
	);
	return ipRes.stdout.toString().trim();
}

async function main() {
	logger.banner("Service IP Checker");

	await initShell();

	const guacdIp = await getContainerIp(GUACD_CONTAINER);
	const clabApiServerIp = await getContainerIp(CLAB_API_SERVER_CONTAINER);

	logger.log(`Guacd IP: ${guacdIp}`);
	logger.log(`Containerlab API Server IP: ${clabApiServerIp}`);
}

main().catch((err) => {
	logger.error(`Unexpected error: ${err.message ?? err}`);
	process.exit(1);
});
