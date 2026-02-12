import logger from "../../common/logger";
import { execute } from "../../common/shell";
import { detectArchitecture } from "../../common/utils";

export interface GuacamoleOptions {
	networks: string[];
}

const GUACD_CONTAINER = "guacd";
const GUACD_VERSION = "1.5.3";

export async function deployGuacd(options: GuacamoleOptions) {
	logger.section("Deploying Guacamole Daemon (guacd)");

	const arch = await detectArchitecture();
	const hostArch = arch.raw;
	let buildRequired = false;
	let guacdImage = `guacamole/guacd:${GUACD_VERSION}`;

	if (arch.isArm) {
		buildRequired = true;
		guacdImage = `guacd-local:${GUACD_VERSION}`;
	} else if (hostArch !== "x86_64") {
		logger.warn(`Unknown arch: ${hostArch}, trying official image`);
	}

	const existingContainer = await execute(
		`docker ps -a --format '{{.Names}}' | grep -q "^${GUACD_CONTAINER}$" && echo yes || echo no`,
	);

	if (existingContainer.stdout.toString().trim() === "yes") {
		const currentImageRes = await execute(
			`docker inspect --format='{{.Config.Image}}' "${GUACD_CONTAINER}"`,
		);
		const currentImage = currentImageRes.stdout.toString().trim();

		if (currentImage !== guacdImage) {
			logger.warn(
				`guacd version mismatch. Current: ${currentImage}, Expected: ${guacdImage}`,
			);
			logger.info("Removing old guacd container...");
			await execute(`docker rm -f "${GUACD_CONTAINER}"`);
		} else {
			const isRunning = await execute(
				`docker ps --format '{{.Names}}' | grep -q "^${GUACD_CONTAINER}$" && echo yes || echo no`,
			);
			if (isRunning.stdout.toString().trim() === "yes") {
				logger.success(`guacd container running (${GUACD_VERSION})`);
				for (const network of options.networks) await ensureNetwork(network);
			} else {
				logger.info("Starting guacd container...");
				await execute(`docker start "${GUACD_CONTAINER}"`);
				for (const network of options.networks) await ensureNetwork(network);
				logger.success("guacd container started");
			}
			return; // We're done if it exists and matches version
		}
	}

	// Wait, if we reached here, the container doesn't exist or was just removed
	if (buildRequired) {
		logger.warn(
			`ARM detected - official image not available for ${GUACD_VERSION}`,
		);
		const imageExists = await execute(
			`docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^guacd-local:${GUACD_VERSION}$" && echo yes || echo no`,
		);

		if (imageExists.stdout.toString().trim() === "yes") {
			logger.info(`Using existing locally-built guacd image: ${guacdImage}`);
		} else {
			logger.info(
				`Building guacd ${GUACD_VERSION} from source (this may take 5-10 minutes)...`,
			);

			const tmpDirRes = await execute("mktemp -d");
			const buildDir = tmpDirRes.stdout.toString().trim();

			logger.info(
				`Cloning guacamole-server repository (tag ${GUACD_VERSION})...`,
			);
			const cloneRes = await execute(
				`git clone --depth 1 --branch "${GUACD_VERSION}" https://github.com/apache/guacamole-server.git "${buildDir}/guacamole-server"`,
			);

			if (cloneRes.exitCode !== 0) {
				await execute(`rm -rf "${buildDir}"`);
				throw new Error(
					`Failed to clone repository or tag ${GUACD_VERSION} not found`,
				);
			}

			logger.info("Patching build files for compatibility...");
			const srcDir = `${buildDir}/guacamole-server`;

			// Patch Dockerfile
			await execute(
				`sed -i 's/openssl1.1-compat-dev/openssl-dev/g' "${srcDir}/Dockerfile"`,
			);
			await execute(
				`sed -i 's/openssl1.1-compat/openssl/g' "${srcDir}/Dockerfile"`,
			);

			const buildAllScript = `${srcDir}/src/guacd-docker/bin/build-all.sh`;
			const scriptExists = await execute(
				`test -f "${buildAllScript}" && echo yes || echo no`,
			);

			if (scriptExists.stdout.toString().trim() === "yes") {
				await execute(
					`sed -i 's/if \\[ -e CMakeLists.txt \\]; then/if [ -e CMakeLists.txt ]; then\\n        find . -name CMakeLists.txt -exec sed -i "s\\/cmake_minimum_required(VERSION [0-9]\\\\+\\\\.[0-9]\\\\+\\(\\\\.[0-9]\\\\+\\)\\\\?)\\/cmake_minimum_required(VERSION 3.5)\\/g" {} \\\\;/g' "${buildAllScript}"`,
				);
				await execute(
					`sed -i 's|export CFLAGS="-I\${PREFIX_DIR}/include"|export CFLAGS="-I\${PREFIX_DIR}/include -Wno-error=incompatible-pointer-types"|g' "${buildAllScript}"`,
				);
				await execute(
					`sed -i 's/install_from_git "https:\\/\\/github.com\\/FreeRDP\\/FreeRDP" "$WITH_FREERDP" $FREERDP_OPTS/install_from_git "https:\\/\\/github.com\\/FreeRDP\\/FreeRDP" "$WITH_FREERDP" $FREERDP_OPTS -DWITH_SSE2=OFF/g' "${buildAllScript}"`,
				);
			} else {
				logger.warn("Could not find build-all.sh to patch");
			}

			logger.info("Building Docker image...");
			const buildRes = await execute(
				`docker build -t "${guacdImage}" "${srcDir}"`,
			);

			await execute(`rm -rf "${buildDir}"`);

			if (buildRes.exitCode === 0) {
				logger.success("guacd image built successfully");
			} else {
				throw new Error("Failed to build guacd image");
			}
		}
	} else {
		logger.info(`Using official image: ${guacdImage}`);
	}

	logger.info(`Creating guacd container (${GUACD_VERSION})...`);
	const [primaryNetwork, ...additionalNetworks] = options.networks;
	const runRes = await execute(
		`docker run -d --name "${GUACD_CONTAINER}" --network "${primaryNetwork}" --restart unless-stopped "${guacdImage}"`,
	);

	if (runRes.exitCode !== 0) {
		throw new Error("Failed to create guacd container");
	}

	logger.info("Waiting for container initialization...");
	await new Promise((r) => setTimeout(r, 3000));

	logger.success("guacd container created and started");

	for (const network of additionalNetworks) await ensureNetwork(network);

	logger.info("Verifying guacd...");
	await new Promise((r) => setTimeout(r, 2000));
	const healthyCheck = await execute(
		`docker ps --filter "name=^${GUACD_CONTAINER}$" --filter "status=running" | grep -q "${GUACD_CONTAINER}" && echo yes || echo no`,
	);

	if (healthyCheck.stdout.toString().trim() === "yes") {
		logger.success("guacd is healthy");
	} else {
		logger.warn(
			`guacd may not be healthy, check logs: docker logs ${GUACD_CONTAINER}`,
		);
	}
}

async function ensureNetwork(network: string) {
	// The pipeline always exits 0 (echo yes/no), safe to call without try/catch
	const netExists = await execute(
		`docker network inspect "${network}" > /dev/null 2>&1 && echo yes || echo no`,
	);
	if (netExists.stdout.toString().trim() !== "yes") {
		logger.warn(
			`Network "${network}" does not exist yet — skipping guacd attachment`,
		);
		return;
	}

	const netCheck = await execute(
		`docker network inspect "${network}" | grep -q '"${GUACD_CONTAINER}"' && echo yes || echo no`,
	);
	if (netCheck.stdout.toString().trim() !== "yes") {
		logger.info(`Connecting guacd to ${network} network...`);
		try {
			await execute(`docker network connect "${network}" "${GUACD_CONTAINER}"`);
		} catch (err) {
			logger.warn(
				`Failed to connect guacd to "${network}" network: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}
}
