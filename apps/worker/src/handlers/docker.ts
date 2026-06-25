import docker from "@worker/lib/docker";
import type { RpcServer } from "./server";

export function registerDockerHandlers(server: RpcServer) {
	server.on("docker:pullImage", async ({ payload: { image } }) => {
		await new Promise<void>((resolve, reject) => {
			docker.pull(image, {}, (err, stream) => {
				if (err || !stream) {
					return reject(err ?? new Error("Image pull failed"));
				}
				docker.modem.followProgress(stream, (err) => {
					if (err) return reject(err);
					resolve();
				});
			});
		});
	});

	server.on(
		"docker:measureContainerStats",
		async ({ payload: { containerId }, reply }) => {
			const stats = (await docker
				.getContainer(containerId)
				// biome-ignore lint/suspicious/noExplicitAny: Docker stats shape is not typed by dockerode
				.stats({ stream: false })) as any;

			const cpuDelta =
				stats.cpu_stats.cpu_usage.total_usage -
				stats.precpu_stats.cpu_usage.total_usage;
			const systemDelta =
				stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
			const numCpus =
				stats.cpu_stats.online_cpus ??
				stats.cpu_stats.cpu_usage.percpu_usage?.length ??
				1;
			const cpuCores =
				systemDelta > 0
					? Math.round((cpuDelta / systemDelta) * numCpus * 100) / 100
					: 0;

			const cache =
				(stats.memory_stats.stats as Record<string, number> | undefined)
					?.cache ?? 0;
			const memoryMB = Math.round(
				(stats.memory_stats.usage - cache) / (1024 * 1024),
			);

			reply("result", { cpuCores, memoryMB });
		},
	);
}
