import type { Compose } from "compose-spec-schema";
import yaml from "yaml";
import { ask, confirm } from "../common/input";
import logger from "../common/logger";
import { execute } from "../common/shell";

export interface EnvConfig {
	repoName: string;
	deployPath: string;
	networks: string[];
	dbUrl: string;
	redisUrl: string;
	vlabNetwork: string;
	baseUrl: string;
	casBaseUrl: string;
	bindPort: string;
	sessionTtl: string;
	s3AccessKey: string;
	s3SecretKey: string;
	s3Endpoint: string;
	useNginxProxy: boolean;
	virtualHost: string;
	useLetsencrypt: boolean;
	letsencryptEmail: string;
}

export async function gatherAndSetupEnvironment(
	deployPath: string,
): Promise<EnvConfig> {
	logger.section("Docker Networks");

	const envFileRes = await execute(`cat "${deployPath}/.env" || echo ""`);
	const envFile = envFileRes.stdout.toString().trim();

	const parseEnv = (key: string) => {
		const match = envFile.match(new RegExp(`^${key}=(.*)$`, "m"));
		return match ? match[1] : "";
	};

	let existingDbHost = "",
		existingDbPort = "5432",
		existingDbName = "vlab",
		existingDbUser = "vlab",
		existingDbPassword = "";
	const existingDbUrl = parseEnv("DATABASE_URL");
	if (existingDbUrl) {
		const dbMatch = existingDbUrl.match(
			/postgresql:\/\/([^:]+):([^@]+)@([^:]+):([^/]+)\/(.*)/,
		);
		if (dbMatch) {
			existingDbUser = dbMatch[1] || "";
			existingDbPassword = dbMatch[2] || "";
			existingDbHost = dbMatch[3] || "";
			existingDbPort = dbMatch[4] || "5432";
			existingDbName = dbMatch[5] || "vlab";
		}
	}

	let existingRedisHost = "",
		existingRedisPort = "6379",
		existingRedisPassword = "";
	const existingRedisUrl = parseEnv("REDIS_URL");
	if (existingRedisUrl) {
		const redisMatchP = existingRedisUrl.match(
			/redis:\/\/:([^@]+)@([^:]+):([0-9]+)/,
		);
		if (redisMatchP) {
			existingRedisPassword = redisMatchP[1] || "";
			existingRedisHost = redisMatchP[2] || "";
			existingRedisPort = redisMatchP[3] || "6379";
		} else {
			const redisMatchN = existingRedisUrl.match(/redis:\/\/([^:]+):([0-9]+)/);
			if (redisMatchN) {
				existingRedisHost = redisMatchN[1] || "";
				existingRedisPort = redisMatchN[2] || "6379";
			}
		}
	}

	let useExisting = false;
	if (envFile) {
		logger.info("Found existing .env file.");
		useExisting = await confirm(
			"Use existing configuration as defaults?",
			true,
		);
	}

	const defaultNetworks = parseEnv("DOCKER_NETWORKS");
	const networksInput = await ask(
		"Enter Docker networks (comma-separated)",
		useExisting ? defaultNetworks : "",
	);

	const networks = networksInput
		.split(",")
		.map((n) => n.trim())
		.filter((n) => !!n && n !== "bridge" && n !== "vlab");

	for (const network of networks) {
		const netCheck = await execute(
			`docker network inspect "${network}" >/dev/null 2>&1 && echo yes || echo no`,
		);
		if (netCheck.stdout.toString().trim() === "yes") {
			logger.info(`Network '${network}' exists`);
		} else {
			logger.info(`Creating network: ${network}`);
			await execute(`docker network create "${network}"`);
			logger.success(`Network '${network}' created`);
		}
	}

	const vlabNetwork = "vlab";
	const netCheckVlab = await execute(
		`docker network inspect "${vlabNetwork}" >/dev/null 2>&1 && echo yes || echo no`,
	);
	if (netCheckVlab.stdout.toString().trim() === "yes") {
		logger.info(`Network '${vlabNetwork}' exists`);
	} else {
		logger.info(`Creating network: ${vlabNetwork}`);
		await execute(`docker network create "${vlabNetwork}"`);
		logger.success(`Network '${vlabNetwork}' created`);
	}

	logger.section("Database");
	const dbHost = await ask(
		"PostgreSQL Host",
		useExisting ? existingDbHost : "localhost",
	);
	const dbPort = await ask(
		"PostgreSQL Port",
		useExisting ? existingDbPort : "5432",
	);
	const dbName = await ask(
		"Database Name",
		useExisting ? existingDbName : "vlab",
	);
	const dbUser = await ask(
		"Database User",
		useExisting ? existingDbUser : "vlab",
	);

	let dbPassword = "";
	if (useExisting && existingDbPassword) {
		const passIn = await ask(
			"Database Password (leave empty to keep existing)",
		);
		dbPassword = passIn ? passIn : existingDbPassword;
	} else {
		dbPassword = await ask("Database Password");
	}
	const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

	logger.section("Redis");
	const redisHost = await ask(
		"Redis Host",
		useExisting ? existingRedisHost : "",
	);
	const redisPort = await ask(
		"Redis Port",
		useExisting ? existingRedisPort : "6379",
	);
	let redisPassword = "";
	if (useExisting && existingRedisPassword) {
		const passIn = await ask("Redis Password (leave empty to keep existing)");
		redisPassword = passIn ? passIn : existingRedisPassword;
	} else {
		redisPassword = await ask("Redis Password (empty for none)");
	}
	const redisUrl = redisPassword
		? `redis://:${redisPassword}@${redisHost}:${redisPort}`
		: `redis://${redisHost}:${redisPort}`;

	logger.section("Application Application");
	const baseUrl = await ask(
		"Domain/URL",
		useExisting ? parseEnv("BASE_URL") : "http://localhost:3000",
	);
	const casBaseUrl = await ask(
		"CAS server URL",
		useExisting ? parseEnv("CAS_BASE_URL") : "https://sso.ui.ac.id/cas2",
	);

	logger.info("Leave port empty if using nginx-proxy");
	const bindPort = await ask(
		"Bind port",
		useExisting ? parseEnv("BIND_PORT") : "",
	);
	const sessionTtl = await ask(
		"Session TTL seconds",
		useExisting ? parseEnv("SESSION_TTL") || "10800" : "10800",
	);

	logger.section("S3 Storage");
	logger.info(
		"Note: Endpoint should include bucket name, e.g., http://localhost:9000/vlab",
	);
	const s3AccessKey = await ask(
		"S3 Access Key",
		useExisting ? parseEnv("S3_ACCESS_KEY") : "",
	);
	let s3SecretKey = "";
	let s3Endpoint = "";
	if (s3AccessKey) {
		if (useExisting && parseEnv("S3_SECRET_KEY")) {
			const passIn = await ask("S3 Secret Key (leave empty to keep existing)");
			s3SecretKey = passIn ? passIn : parseEnv("S3_SECRET_KEY") || "";
		} else {
			s3SecretKey = await ask("S3 Secret Key");
		}
		s3Endpoint = await ask(
			"S3 Endpoint with bucket",
			useExisting ? parseEnv("S3_ENDPOINT") : "",
		);
		logger.success("S3 configuration set");
	} else {
		logger.info("Skipping S3 configuration");
	}

	logger.section("Reverse Proxy");
	const envVirtHost = parseEnv("VIRTUAL_HOST");
	const useNginxProxy = await confirm(
		"Using nginx-proxy?",
		useExisting ? !!envVirtHost : false,
	);
	let virtualHost = "";
	let useLetsencrypt = false;
	let letsencryptEmail = "";

	logger.section("GitHub Settings");
	const repoName = await ask(
		"GitHub repository name for ghcr.io (e.g. owner/vlab-bun)",
		useExisting
			? parseEnv("GITHUB_REPO") || "owner/vlab-bun"
			: "owner/vlab-bun",
	);

	if (useNginxProxy) {
		const defaultVhost = baseUrl.replace(/^https?:\/\//, "");
		virtualHost = await ask(
			"Virtual host",
			useExisting && envVirtHost ? envVirtHost : defaultVhost,
		);
		const envUseLe = parseEnv("LETSENCRYPT_EMAIL");
		useLetsencrypt = await confirm(
			"Enable Let's Encrypt?",
			useExisting ? !!envUseLe : false,
		);
		if (useLetsencrypt) {
			letsencryptEmail = await ask(
				"Email for Let's Encrypt",
				useExisting ? envUseLe : "",
			);
		}
	}

	return {
		repoName,
		deployPath,
		networks,
		dbUrl: databaseUrl,
		redisUrl,
		vlabNetwork,
		baseUrl,
		casBaseUrl,
		bindPort,
		sessionTtl,
		s3AccessKey,
		s3SecretKey,
		s3Endpoint,
		useNginxProxy,
		virtualHost,
		useLetsencrypt,
		letsencryptEmail,
	};
}

export async function writeEnvFile(
	config: EnvConfig,
	guacdContainer: string,
	clabContainer: string,
): Promise<void> {
	logger.section("Creating .env");

	const randHex = async (len: number) => {
		const res = await execute(`openssl rand -hex ${len}`);
		return res.stdout.toString().trim();
	};

	const cookieSecret = await randHex(16);
	const guacdSecret = await randHex(16);

	const allNetworks = [...config.networks, config.vlabNetwork].join(",");

	let envContent = `# vLab Production Environment\n# Updated: ${new Date().toISOString().split("T")[0]}\n\n`;
	envContent += `DATABASE_URL=${config.dbUrl}\n`;
	envContent += `REDIS_URL=${config.redisUrl}\n`;
	envContent += `DOCKER_NETWORKS=${allNetworks}\n`;

	if (config.bindPort) {
		envContent += `BIND_PORT=${config.bindPort}\n`;
	} else {
		envContent += `# BIND_PORT=\n`;
	}

	envContent += `SESSION_TTL=${config.sessionTtl}\n`;
	envContent += `BATCH_SIZE=100\n`;
	envContent += `DEBOUNCE_MS=100\n`;
	envContent += `MAX_BATCH_WAIT_MS=500\n`;
	envContent += `NODE_ENV=production\n`;
	envContent += `BASE_URL=${config.baseUrl}\n`;
	envContent += `CAS_BASE_URL=${config.casBaseUrl}\n`;
	envContent += `COOKIE_SECRET=${cookieSecret}\n`;
	envContent += `GUACD_HOST=${guacdContainer}\n`;
	envContent += `GUACD_PORT=4822\n`;
	envContent += `GUACD_SECRET=${guacdSecret}\n`;

	if (config.s3AccessKey) {
		envContent += `S3_ACCESS_KEY=${config.s3AccessKey}\n`;
		envContent += `S3_SECRET_KEY=${config.s3SecretKey}\n`;
		envContent += `S3_ENDPOINT=${config.s3Endpoint}\n`;
	} else {
		envContent += `S3_ACCESS_KEY=\n`;
		envContent += `S3_SECRET_KEY=\n`;
		envContent += `S3_ENDPOINT=\n`;
	}

	envContent += `\nCLAB_URL=http://${clabContainer}:8080\n`;
	envContent += `CLAB_USERNAME=admin\n`;
	envContent += `CLAB_PASSWORD=admin\n`;

	if (config.useNginxProxy && config.virtualHost) {
		envContent += `VIRTUAL_HOST_MULTIPORTS={"${config.virtualHost}":{"/":{"port":3000},"/display":{"port":8080,"dest":"/"}}}\n`;
		if (config.useLetsencrypt) {
			envContent += `LETSENCRYPT_HOST=${config.virtualHost}\n`;
			envContent += `LETSENCRYPT_EMAIL=${config.letsencryptEmail}\n`;
		}
	}

	envContent += `\nGITHUB_REPO=${config.repoName}\n`;

	// Wait, the bash script creates a local file directly using cat > $DEPLOY_PATH/.env. We will use execute to write.
	// Since envContent can be large, we can echo it into a file using EOF trick
	await execute(`cat > "${config.deployPath}/.env" << 'EOF'
${envContent}
EOF`);

	logger.success(".env created");

	logger.section("Creating docker-compose.yml");

	const composeObj: Compose = {
		services: {
			"vlab-app": {
				image: `ghcr.io/${config.repoName.toLowerCase()}:main`,
				restart: "always",
				env_file: [".env"],
				volumes: ["/var/run/docker.sock:/var/run/docker.sock"],
				networks: ["vlab", "clab", ...config.networks],
			},
		},
		networks: {
			vlab: {
				external: true,
				name: config.vlabNetwork || "vlab",
			},
			clab: {
				external: true,
				name: "clab",
			},
		},
	};

	for (const net of config.networks) {
		// biome-ignore lint/style/noNonNullAssertion: false positive
		composeObj.networks![net] = {
			external: true,
			name: net,
		};
	}

	const composeContent = yaml.stringify(composeObj);

	await execute(`cat > "${config.deployPath}/docker-compose.yml" << 'EOF'
${composeContent}
EOF`);

	logger.success("docker-compose.yml created");
}
