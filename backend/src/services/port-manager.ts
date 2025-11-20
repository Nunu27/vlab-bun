import env from "@backend/env";
import redis from "@backend/services/redis";
import { Socket } from "net";

const HOST = env.CLAB_HOST;
const MIN_PORT = 10000;
const MAX_PORT = 65535;
const REDIS_KEY = `leased-ports`;

async function getLeasedPorts(): Promise<Set<number>> {
	const ports = await redis.get<number[]>(REDIS_KEY);
	return new Set(ports || []);
}

async function saveLeasedPorts(ports: Set<number>): Promise<void> {
	await redis.set(REDIS_KEY, Array.from(ports));
}

async function isPortAvailable(port: number): Promise<boolean> {
	const leasedPorts = await getLeasedPorts();
	if (leasedPorts.has(port)) {
		return false;
	}

	return new Promise((resolve) => {
		const socket = new Socket();
		socket.setTimeout(1000); // 1 second timeout

		socket.connect(port, HOST, () => {
			socket.destroy();
			resolve(false); // Port is open (in use), not available
		});

		socket.on("error", () => {
			resolve(true); // Port is closed (available)
		});

		socket.on("timeout", () => {
			socket.destroy();
			resolve(true); // Timeout means closed (available)
		});
	});
}

async function findNextAvailablePort(
	startFrom?: number
): Promise<number | null> {
	const leasedPorts = await getLeasedPorts();
	let currentPort = startFrom || MIN_PORT;
	const initialPort = currentPort;

	do {
		if (!leasedPorts.has(currentPort)) {
			if (await isPortAvailable(currentPort)) {
				return currentPort;
			}
		}

		currentPort++;
		if (currentPort > MAX_PORT) {
			currentPort = MIN_PORT;
		}
	} while (currentPort !== initialPort);

	return null;
}

export async function leasePort(): Promise<number> {
	for (let attempt = 0; attempt < 3; attempt++) {
		const port = await findNextAvailablePort();
		if (port === null) {
			throw new Error(
				`No available ports in range ${MIN_PORT}-${MAX_PORT} on host ${HOST}`
			);
		}

		const leasedPorts = await getLeasedPorts();
		if (leasedPorts.has(port)) {
			continue;
		}

		leasedPorts.add(port);
		await saveLeasedPorts(leasedPorts);

		if (await isPortAvailable(port)) {
			return port;
		}

		leasedPorts.delete(port);
		await saveLeasedPorts(leasedPorts);
	}

	throw new Error(
		`Failed to lease port on host ${HOST} after multiple attempts`
	);
}

export async function leasePorts(
	count: number,
	consecutive = false
): Promise<number[]> {
	if (count <= 0) {
		return [];
	}

	if (consecutive) {
		return leaseConsecutivePorts(count);
	}

	const ports: number[] = [];
	for (let i = 0; i < count; i++) {
		const port = await leasePort();
		ports.push(port);
	}
	return ports;
}

async function leaseConsecutivePorts(count: number): Promise<number[]> {
	const leasedPorts = await getLeasedPorts();

	for (
		let startPort = MIN_PORT;
		startPort <= MAX_PORT - count + 1;
		startPort++
	) {
		const ports = Array.from({ length: count }, (_, i) => startPort + i);

		if (ports.some((p) => leasedPorts.has(p))) {
			continue;
		}

		const allAvailable = await Promise.all(
			ports.map((port) => isPortAvailable(port))
		);

		if (allAvailable.every((available) => available)) {
			ports.forEach((port) => leasedPorts.add(port));
			await saveLeasedPorts(leasedPorts);
			return ports;
		}
	}

	throw new Error(
		`No ${count} consecutive ports available in range ${MIN_PORT}-${MAX_PORT} on host ${HOST}`
	);
}

export async function releasePort(port: number): Promise<boolean> {
	const leasedPorts = await getLeasedPorts();
	const wasLeased = leasedPorts.delete(port);
	if (wasLeased) {
		await saveLeasedPorts(leasedPorts);
	}
	return wasLeased;
}

export async function releasePorts(ports: number[]): Promise<number> {
	const leasedPorts = await getLeasedPorts();
	let released = 0;
	for (const port of ports) {
		if (leasedPorts.delete(port)) {
			released++;
		}
	}
	if (released > 0) {
		await saveLeasedPorts(leasedPorts);
	}
	return released;
}

export async function getAllLeasedPorts(): Promise<number[]> {
	const leasedPorts = await getLeasedPorts();
	return Array.from(leasedPorts).sort((a, b) => a - b);
}

export async function resetLeasedPorts(): Promise<void> {
	await redis.del(REDIS_KEY);
}
