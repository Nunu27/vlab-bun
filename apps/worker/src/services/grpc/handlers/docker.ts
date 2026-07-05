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
		const { cpu_stats, precpu_stats, memory_stats } = await docker
			.getContainer(id)
			.stats({ stream: false });

		const cpuDelta =
			cpu_stats.cpu_usage.total_usage - precpu_stats.cpu_usage.total_usage;
		const systemDelta =
			cpu_stats.system_cpu_usage - precpu_stats.system_cpu_usage;
		const numCpus =
			cpu_stats.online_cpus ?? cpu_stats.cpu_usage.percpu_usage.length ?? 1;
		const cpuCores =
			systemDelta > 0
				? Math.round((cpuDelta / systemDelta) * numCpus * 100) / 100
				: 0;

		const cache =
			memory_stats.stats?.cache ?? memory_stats.stats?.inactive_file ?? 0;
		const usage = memory_stats.usage ?? 0;
		const memoryMB = Math.round(
			usage > 0 ? (usage - cache) / (1024 * 1024) : 0,
		);

		return { cpuCores, memoryMB };
	});
}
