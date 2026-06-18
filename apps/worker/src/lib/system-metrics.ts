import fs from "node:fs";
import os from "node:os";

let lastCpus = os.cpus();

export function getCpuUsage() {
	const currentCpus = os.cpus();
	let totalDiff = 0;
	let idleDiff = 0;
	for (let i = 0; i < currentCpus.length; i++) {
		const cpu = currentCpus[i];
		const lastCpu = lastCpus[i];
		if (!cpu || !lastCpu) continue;
		const total = Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0);
		const lastTotal = Object.values(lastCpu.times).reduce(
			(acc, tv) => acc + tv,
			0,
		);
		totalDiff += total - lastTotal;
		idleDiff += cpu.times.idle - lastCpu.times.idle;
	}
	lastCpus = currentCpus;
	const used = totalDiff - idleDiff;
	const percentage = totalDiff === 0 ? 0 : (100 * used) / totalDiff;
	return { total: totalDiff, available: idleDiff, used, percentage };
}

export function getStorageInfo() {
	try {
		const stat = fs.statfsSync("/");
		const total = (stat.blocks * stat.bsize) / (1024 * 1024);
		const available = (stat.bfree * stat.bsize) / (1024 * 1024);
		const used = total - available;
		const percentage = total === 0 ? 0 : (used / total) * 100;
		return { total, available, used, percentage };
	} catch (_e) {
		return { total: 0, available: 0, used: 0, percentage: 0 };
	}
}

export function getMemoryUsage() {
	const totalBytes = os.totalmem();
	const availableBytes = os.freemem();
	const usedBytes = totalBytes - availableBytes;
	const total = totalBytes / (1024 * 1024);
	const available = availableBytes / (1024 * 1024);
	const used = usedBytes / (1024 * 1024);
	const percentage = (used / total) * 100;
	return { total, available, used, percentage };
}
