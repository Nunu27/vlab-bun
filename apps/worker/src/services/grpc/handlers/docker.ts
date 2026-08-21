import type { Readable } from "node:stream";
import {
	STATS_SAMPLE_COUNT,
	STATS_SAMPLE_TIMEOUT_MS,
	STATS_TIGHT_LIMIT_RATIO,
} from "@worker/constants";
import docker, { pullImage } from "@worker/lib/docker";
import type Docker from "dockerode";
import type { RpcServer } from "../transport";

type Sample = { cpuCores: number; memoryMB: number };

/**
 * The container's all-time high-water memory mark, in MiB, from cgroup v2.
 *
 * Sampled `usage` cannot answer "did this ever press against its cap": a node
 * that spiked to 20 MiB during boot and settled to 2 MiB reads as 2, so a cap
 * of 22 looks generous when it was actually nearly hit. `memory.peak` keeps the
 * maximum since the container started, boot included. Returns null when the
 * file is not where we expect, in which case the caller falls back to samples.
 */
async function readPeakMemoryMB(containerId: string): Promise<number | null> {
	const candidates = [
		`/sys/fs/cgroup/system.slice/docker-${containerId}.scope/memory.peak`,
		`/sys/fs/cgroup/docker/${containerId}/memory.peak`,
	];

	for (const path of candidates) {
		try {
			const raw = (await Bun.file(path).text()).trim();
			const bytes = Number(raw);
			if (Number.isFinite(bytes) && bytes > 0) {
				return Math.ceil(bytes / (1024 * 1024));
			}
		} catch {
			// Try the next layout.
		}
	}

	return null;
}

function readSample(stats: Docker.ContainerStats): Sample | null {
	const { cpu_stats, precpu_stats, memory_stats } = stats || {};

	const cpuDelta =
		(cpu_stats?.cpu_usage?.total_usage ?? 0) -
		(precpu_stats?.cpu_usage?.total_usage ?? 0);
	const systemDelta =
		(cpu_stats?.system_cpu_usage ?? 0) - (precpu_stats?.system_cpu_usage ?? 0);

	// The first frame of a stream has no previous reading to diff against.
	if (systemDelta <= 0) return null;

	const numCpus =
		cpu_stats?.online_cpus ?? cpu_stats?.cpu_usage?.percpu_usage?.length ?? 1;
	const cpuCores =
		cpuDelta > 0
			? Math.round((cpuDelta / systemDelta) * numCpus * 100) / 100
			: 0;

	const cache =
		memory_stats?.stats?.cache ?? memory_stats?.stats?.inactive_file ?? 0;
	const usage = memory_stats?.usage ?? 0;
	const memoryMB = Math.round(usage > 0 ? (usage - cache) / (1024 * 1024) : 0);

	return { cpuCores, memoryMB };
}

/**
 * Collect a short run of samples from docker's stats stream.
 *
 * Docker pushes a frame roughly once a second and each frame carries the
 * previous one as `precpu_stats`, so consecutive frames give real deltas. This
 * is a bounded one-shot read: it takes what it needs and closes the stream.
 */
async function collectSamples(container: Docker.Container): Promise<Sample[]> {
	const stream = (await container.stats({ stream: true })) as Readable;
	const samples: Sample[] = [];

	return await new Promise<Sample[]>((resolve, reject) => {
		let buffer = "";

		const finish = () => {
			clearTimeout(timer);
			stream.destroy();
			resolve(samples);
		};

		// Guards against a container that stops emitting mid-measurement.
		const timer = setTimeout(finish, STATS_SAMPLE_TIMEOUT_MS);

		stream.on("data", (chunk: Buffer) => {
			buffer += chunk.toString();

			// Frames are newline delimited; the tail may be a partial frame.
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				if (!line.trim()) continue;

				try {
					const sample = readSample(JSON.parse(line));
					if (sample) samples.push(sample);
				} catch {
					// A truncated or malformed frame is not worth failing over.
				}
			}

			if (samples.length >= STATS_SAMPLE_COUNT) finish();
		});

		stream.on("error", (err) => {
			clearTimeout(timer);
			// Whatever was collected before the break is still usable.
			if (samples.length) resolve(samples);
			else reject(err);
		});

		stream.on("end", finish);
	});
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);

	return sorted.length % 2
		? (sorted[mid] ?? 0)
		: ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

export function registerDockerHandlers(server: RpcServer) {
	server.on("docker:pullImage", async ({ payload: { image } }) => {
		await pullImage(image);
	});

	server.on("docker:measureContainerStats", async ({ payload: { id } }) => {
		const container = docker.getContainer(id);
		const [samples, info] = await Promise.all([
			collectSamples(container),
			container.inspect(),
		]);

		// 0 means docker was given no --memory, so the node is uncapped.
		const limitBytes = info.HostConfig?.Memory ?? 0;
		// Rounded: this is rendered straight into the admin UI, and containerlab's
		// decimal units make the raw value fractional (64Mb is 61.03515625 MiB).
		const memoryLimitMB =
			limitBytes > 0 ? Math.round(limitBytes / (1024 * 1024)) : null;

		if (!samples.length) {
			return {
				cpuCores: 0,
				memoryMB: 0,
				peakMemoryMB: (await readPeakMemoryMB(info.Id)) ?? 0,
				samples: 0,
				memoryLimitMB,
				limitLooksTight: false,
			};
		}

		// Settled usage, measured after the node finished booting. This is the
		// cost, so the transient boot spike deliberately does not set it: a lab
		// holds its reservation for hours and boots once. Median CPU for the same
		// reason. No headroom, see the note in constants.
		const memoryMB = Math.ceil(Math.max(...samples.map((s) => s.memoryMB)));
		const cpuCores =
			Math.round(median(samples.map((s) => s.cpuCores)) * 100) / 100;

		// The cap has to survive the spike even though the cost does not, so the
		// tightness check uses the high-water mark rather than settled usage.
		const peakMemoryMB = (await readPeakMemoryMB(info.Id)) ?? memoryMB;

		// Sitting this close to the cap usually means the kernel is reclaiming to
		// keep the node under it, rather than the node having settled naturally.
		// Such a node looks healthy right up until it needs the memory it is
		// being denied, so the measurement is reported as suspect rather than
		// being treated as the node's real footprint.
		const limitLooksTight =
			memoryLimitMB !== null &&
			peakMemoryMB >= memoryLimitMB * STATS_TIGHT_LIMIT_RATIO;

		return {
			// A near-idle node can measure 0 cores; reserving literally nothing
			// for it is wrong, so keep a token floor.
			cpuCores: cpuCores || 0.1,
			memoryMB,
			peakMemoryMB,
			samples: samples.length,
			memoryLimitMB,
			limitLooksTight,
		};
	});
}
