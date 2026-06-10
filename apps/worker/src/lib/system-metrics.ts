import fs from "node:fs";
import os from "node:os";

let lastCpus = os.cpus();

export function getCpuUsagePercent() {
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
	if (totalDiff === 0) return 0;
	return 100 - (100 * idleDiff) / totalDiff;
}

export function getStorageInfo() {
	try {
		const stat = fs.statfsSync("/");
		const totalMb = (stat.blocks * stat.bsize) / (1024 * 1024);
		const freeMb = (stat.bfree * stat.bsize) / (1024 * 1024);
		const usedPercent = ((totalMb - freeMb) / totalMb) * 100;
		return { totalMb, usedPercent };
	} catch (_e) {
		return { totalMb: 0, usedPercent: 0 };
	}
}

export function getMemoryUsagePercent() {
	const totalMem = os.totalmem();
	const freeMem = os.freemem();
	return ((totalMem - freeMem) / totalMem) * 100;
}
