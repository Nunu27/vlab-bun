import docker from "@worker/lib/docker";
import type { RpcServer } from "../transport";

export function registerDockerHandlers(server: RpcServer) {
	server.on("docker:pullImage", async ({ payload: { image } }) => {
		const pullStream = await docker.pull(image);
		await new Promise((resolve, reject) => {
			docker.modem.followProgress(pullStream, (err, res) =>
				err ? reject(err) : resolve(res),
			);
		});
	});

	server.on("docker:measureContainerStats", async ({ payload: { id } }) => {
		const stats = await docker.getContainer(id).stats({ stream: false });
		const { cpu_stats, precpu_stats, memory_stats } = stats || {};

		const cpuUsageTotal = cpu_stats?.cpu_usage?.total_usage ?? 0;
		const precpuUsageTotal = precpu_stats?.cpu_usage?.total_usage ?? 0;
		const cpuDelta = cpuUsageTotal - precpuUsageTotal;

		const systemCpuUsage = cpu_stats?.system_cpu_usage ?? 0;
		const presystemCpuUsage = precpu_stats?.system_cpu_usage ?? 0;
		const systemDelta = systemCpuUsage - presystemCpuUsage;

		const numCpus =
			cpu_stats?.online_cpus ?? cpu_stats?.cpu_usage?.percpu_usage?.length ?? 1;

		const cpuCores =
			systemDelta > 0 && cpuDelta > 0
				? Math.round((cpuDelta / systemDelta) * numCpus * 100) / 100
				: 0;

		const cache =
			memory_stats?.stats?.cache ?? memory_stats?.stats?.inactive_file ?? 0;
		const usage = memory_stats?.usage ?? 0;
		const memoryMB = Math.round(
			usage > 0 ? (usage - cache) / (1024 * 1024) : 0,
		);

		return { cpuCores, memoryMB };
	});
}
