import logger from "../../common/logger";
import { execute } from "../../common/shell";

export interface ClabOptions {
	port: string;
	jwtSecret: string;
	logLevel: string;
	network: string;
}

const CONTAINER = "clab-api-server";
const OFFICIAL_IMAGE =
	"ghcr.io/srl-labs/clab-api-server/clab-api-server:latest";
const BUILD_TAG = "clab-api-server:local";
const REPO_URL = "https://github.com/srl-labs/clab-api-server.git";
const CLONE_DIR = "/tmp/clab-api-server-src";
const DOCKER_DIR = "docker/simple-container";

let PLATFORM = "linux/amd64";
let USE_OFFICIAL_IMAGE = true;
let NEEDS_REBUILD = false;
let IMAGE_UPDATED = false;

import { detectArchitecture } from "../../common/utils";

async function detectRemoteArch() {
	const arch = await detectArchitecture();
	PLATFORM = arch.platform;
	USE_OFFICIAL_IMAGE = arch.platform === "linux/amd64";

	logger.log(`Target architecture: ${arch.raw} → ${PLATFORM}`);
}

async function checkPrerequisites() {
	if (USE_OFFICIAL_IMAGE) {
		logger.log(
			"Using official Docker image (amd64 detected). Skipping source repo checks.",
		);
		return;
	}

	const repoExists = await execute(
		`test -d ${CLONE_DIR}/.git && echo yes || echo no`,
	);
	if (repoExists.stdout.toString().trim() === "yes") {
		logger.info("Cached repo found on target — pulling latest...");
		const preRev = await execute(`git -C ${CLONE_DIR} rev-parse HEAD`);
		await execute(`git -C ${CLONE_DIR} pull --ff-only`);
		const postRev = await execute(`git -C ${CLONE_DIR} rev-parse HEAD`);

		if (preRev.stdout.toString().trim() !== postRev.stdout.toString().trim()) {
			NEEDS_REBUILD = true;
			logger.log("Source code updated, flagging for image rebuild.");
		}
	} else {
		logger.info(`Cloning ${REPO_URL} on target...`);
		const clone = await execute(`git clone --depth 1 ${REPO_URL} ${CLONE_DIR}`);
		if (clone.exitCode !== 0) {
			throw new Error("Failed to clone clab-api-server repo on target.");
		}
		NEEDS_REBUILD = true;
	}

	const buildDir = `${CLONE_DIR}/${DOCKER_DIR}`;
	const hasDockerfile = await execute(
		`test -f ${buildDir}/Dockerfile && echo yes || echo no`,
	);
	if (hasDockerfile.stdout.toString().trim() !== "yes") {
		throw new Error(`No Dockerfile found in ${buildDir} on target`);
	}
	const hasEntrypoint = await execute(
		`test -f ${buildDir}/entrypoint.sh && echo yes || echo no`,
	);
	if (hasEntrypoint.stdout.toString().trim() !== "yes") {
		throw new Error(`No entrypoint.sh found in ${buildDir} on target`);
	}

	logger.log(`Source repo ready: ${CLONE_DIR}`);
}

async function fetchBinary() {
	const goArch = PLATFORM === "linux/arm64" ? "arm64" : "amd64";
	const distDir = `${CLONE_DIR}/dist`;
	const binName = `clab-api-server-linux-${goArch}`;
	const binPath = `${distDir}/${binName}`;
	const versionFile = `${distDir}/.version`;

	const ver = await execute(
		`curl -sLo /dev/null -w '%{url_effective}' https://github.com/srl-labs/clab-api-server/releases/latest | sed 's|.*/tag/||'`,
	);
	if (ver.exitCode !== 0 || !ver.stdout.toString().trim()) {
		throw new Error("Failed to resolve latest clab-api-server release.");
	}
	const version = ver.stdout.toString().trim();
	logger.info(`Latest release: ${version}`);

	await execute(`mkdir -p ${distDir}`);

	const cachedVer = await execute(
		`test -f ${versionFile} && cat ${versionFile} || echo ""`,
	);
	const binExists = await execute(`test -f ${binPath} && echo yes || echo no`);

	if (
		cachedVer.stdout.toString().trim() === version &&
		binExists.stdout.toString().trim() === "yes"
	) {
		logger.log(`Binary for ${version} is already cached at ${binPath}.`);
		return;
	}

	const binUrl = `https://github.com/srl-labs/clab-api-server/releases/download/${version}/${binName}`;
	logger.info(`Downloading ${binName} on target...`);
	const dl = await execute(
		`curl -fsSL ${binUrl} -o ${binPath} && chmod +x ${binPath} && echo "${version}" > ${versionFile}`,
	);
	if (dl.exitCode !== 0) {
		throw new Error(`Failed to download binary from ${binUrl}`);
	}
	logger.log(`Binary downloaded: ${binPath}`);
	NEEDS_REBUILD = true;
}

async function buildImage() {
	logger.section("Building Image Natively");
	const buildDir = `${CLONE_DIR}/${DOCKER_DIR}`;
	const goArch = PLATFORM === "linux/arm64" ? "arm64" : "amd64";

	logger.info(
		`Building ${BUILD_TAG} natively for ${goArch} on the target machine...`,
	);

	const buildCmd = `docker build --build-arg TARGETARCH=${goArch} -f ${buildDir}/Dockerfile -t ${BUILD_TAG} ${CLONE_DIR}`;

	const build = await execute(buildCmd);
	if (build.exitCode !== 0) {
		throw new Error("Docker build failed.");
	}
	logger.log(`Image built: ${BUILD_TAG} (native)`);
}

async function prepareImage(): Promise<string> {
	if (USE_OFFICIAL_IMAGE) {
		logger.info(`Pulling official image: ${OFFICIAL_IMAGE}`);
		const pre = await execute(
			`docker inspect -f '{{.Id}}' ${OFFICIAL_IMAGE} 2>/dev/null || echo ""`,
		);
		const preStr = pre.stdout.toString().trim();

		try {
			await execute(`docker pull ${OFFICIAL_IMAGE}`);
		} catch (e) {
			if (!preStr) {
				throw new Error(
					`Failed to pull official image. No local copy exists.\n${e}`,
				);
			}
			logger.warn(`Could not pull latest image. Using existing local image.`);
		}

		const post = await execute(
			`docker inspect -f '{{.Id}}' ${OFFICIAL_IMAGE} 2>/dev/null || echo ""`,
		);

		const postStr = post.stdout.toString().trim();

		if (preStr !== postStr || preStr === "") {
			IMAGE_UPDATED = true;
			logger.log("A newer official image was fetched.");
		} else {
			logger.log("Official image is up to date.");
		}
		return OFFICIAL_IMAGE;
	} else {
		await fetchBinary();

		const imageExists = await execute(
			`docker inspect -f '{{.Id}}' ${BUILD_TAG} 2>/dev/null || echo ""`,
		);
		if (!imageExists.stdout.toString().trim()) NEEDS_REBUILD = true;

		if (NEEDS_REBUILD) {
			await buildImage();
			IMAGE_UPDATED = true;
		} else {
			logger.log(`Local image ${BUILD_TAG} is up to date.`);
		}
		return BUILD_TAG;
	}
}

interface ContainerState {
	exists: boolean;
	running: boolean;
	image: string;
	port: string;
	logLevel: string;
}

async function inspectContainer(): Promise<ContainerState> {
	const r = await execute(`docker inspect ${CONTAINER}`);
	if (r.exitCode !== 0) {
		return {
			exists: false,
			running: false,
			image: "",
			port: "",
			logLevel: "",
		};
	}
	const data = JSON.parse(r.stdout.toString())[0];
	const env: string[] = data.Config.Env ?? [];
	const getEnv = (key: string) =>
		env.find((e: string) => e.startsWith(`${key}=`))?.split("=")[1] ?? "";
	return {
		exists: true,
		running: data.State.Running === true,
		image: data.Config.Image,
		port: getEnv("API_PORT"),
		logLevel: getEnv("LOG_LEVEL"),
	};
}

async function runContainer(
	imageName: string,
	opts: ClabOptions,
): Promise<void> {
	const cmd = [
		"docker run -d",
		`--name ${CONTAINER}`,
		"--privileged",
		`--network ${opts.network}`,
		"--pid host",
		`-e LOG_LEVEL=${opts.logLevel}`,
		`-e API_PORT=${opts.port}`,
		`-e JWT_SECRET=${opts.jwtSecret}`,
		"-v /var/run/docker.sock:/var/run/docker.sock",
		"-v /var/run/netns:/var/run/netns",
		"-v /var/lib/docker/containers:/var/lib/docker/containers",
		"-v /etc/passwd:/etc/passwd:ro",
		"-v /etc/shadow:/etc/shadow:ro",
		"-v /etc/group:/etc/group:ro",
		"-v /etc/gshadow:/etc/gshadow:ro",
		"-v /home:/home",
		imageName,
	].join(" ");

	const result = await execute(cmd);
	if (result.exitCode !== 0) {
		throw new Error("Failed to start the container.");
	}
	logger.log(
		`Container started: ${result.stdout.toString().trim().slice(0, 12)}`,
	);

	logger.info("Waiting for server to be ready...");
	await new Promise((resolve) => setTimeout(resolve, 3000));

	const running = await execute(
		`docker inspect --format '{{.State.Running}}' ${CONTAINER}`,
	);
	if (running.stdout.toString().trim() !== "true") {
		const logs = await execute(`docker logs --tail 20 ${CONTAINER}`);
		console.error(logs.stderr.toString());
		throw new Error("Container started but exited immediately. Check logs.");
	}
}

export async function deployClab(options: ClabOptions) {
	logger.section("Deploying clab-api-server");

	await detectRemoteArch();
	await checkPrerequisites();

	const TARGET_IMAGE = await prepareImage();
	const state = await inspectContainer();

	if (state.exists) {
		const configChanged =
			state.image !== TARGET_IMAGE ||
			state.port !== options.port ||
			state.logLevel !== options.logLevel;

		if (state.running && !configChanged && !IMAGE_UPDATED) {
			logger.log(
				"Container is already running with the latest image and same config. Nothing to do.",
			);
			return;
		}

		if (!state.running) {
			logger.warn("Container exists but is stopped — redeploying.");
		}
		if (configChanged) {
			logger.warn("Config or Image Target has changed — redeploying.");
		}
		if (IMAGE_UPDATED && !configChanged) {
			logger.warn("New image update available — redeploying.");
		}

		logger.info("Removing old container...");
		await execute(`docker rm -f ${CONTAINER}`);
	}

	logger.info(
		`Starting container on port ${options.port} using ${TARGET_IMAGE}...`,
	);
	await runContainer(TARGET_IMAGE, options);
	logger.log("clab-api-server is up and running.");
}
