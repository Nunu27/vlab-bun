import env from "@backend/env";
import redis from "@backend/services/redis";
import { Socket } from "net";

const HOST = env.CLAB_HOST;
const MIN_PORT = 10000;
const MAX_PORT = 65535;
const REDIS_KEY = `leased-ports`;
const SOCKET_TIMEOUT = 300;

async function isPortAvailable(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = new Socket();
		socket.setTimeout(SOCKET_TIMEOUT);

		socket.on("connect", () => {
			socket.destroy();
			resolve(false);
		});

		socket.on("timeout", () => {
			socket.destroy();
			resolve(true);
		});

		socket.on("error", (err: any) => {
			socket.destroy();
			if (err.code === "ECONNREFUSED" || err.code === "EHOSTUNREACH") {
				resolve(true);
			} else {
				resolve(true);
			}
		});

		socket.connect(port, HOST);
	});
}

function getRandomStartPort(): number {
	return Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1)) + MIN_PORT;
}

export async function leasePort(): Promise<number> {
	const maxAttempts = 50;
	let attempt = 0;
	let currentPort = getRandomStartPort();

	while (attempt < maxAttempts) {
		const isLeased = await redis.sismember(REDIS_KEY, currentPort);

		if (isLeased === 0) {
			if (await isPortAvailable(currentPort)) {
				const added = await redis.sadd(REDIS_KEY, currentPort);
				if (added === 1) {
					return currentPort;
				}
			}
		}

		currentPort++;
		if (currentPort > MAX_PORT) currentPort = MIN_PORT;
		attempt++;
	}

	throw new Error(
		`Failed to lease port on host ${HOST} after multiple attempts`
	);
}

export async function leasePorts(
	count: number,
	consecutive = false
): Promise<number[]> {
	if (count <= 0) return [];

	if (consecutive) {
		return leaseConsecutivePorts(count);
	}

	return Promise.all(Array.from({ length: count }).map(() => leasePort()));
}

async function leaseConsecutivePorts(count: number): Promise<number[]> {
	for (let attempt = 0; attempt < 50; attempt++) {
		const startPort = getRandomStartPort();
		if (startPort + count > MAX_PORT) continue;

		const candidatePorts = Array.from(
			{ length: count },
			(_, i) => startPort + i
		);

		const redisChecks = await Promise.all(
			candidatePorts.map((p) => redis.sismember(REDIS_KEY, p))
		);

		if (redisChecks.some((result) => result === 1)) {
			continue;
		}

		const physicalChecks = await Promise.all(
			candidatePorts.map((p) => isPortAvailable(p))
		);

		if (physicalChecks.some((available) => !available)) {
			continue;
		}

		const stringPorts = candidatePorts.map(String);
		const luaScript = `
            for i, port in ipairs(KEYS) do
                if redis.call("SISMEMBER", "${REDIS_KEY}", port) == 1 then
                    return 0
                end
            end
            for i, port in ipairs(KEYS) do
                redis.call("SADD", "${REDIS_KEY}", port)
            end
            return 1
        `;

		const success = await redis.eval(luaScript, stringPorts);

		if (success === 1) {
			return candidatePorts;
		}
	}

	throw new Error(`No ${count} consecutive ports available on host ${HOST}`);
}

export async function releasePort(port: number): Promise<boolean> {
	const result = await redis.srem(REDIS_KEY, port);
	return result === 1;
}

export async function releasePorts(ports: number[]): Promise<number> {
	if (ports.length === 0) return 0;
	return await redis.srem(REDIS_KEY, ...ports);
}

export async function getAllLeasedPorts(): Promise<number[]> {
	const ports = await redis.smembers(REDIS_KEY);
	return ports.map(Number).sort((a, b) => a - b);
}

export async function resetLeasedPorts(): Promise<void> {
	await redis.del(REDIS_KEY);
}
