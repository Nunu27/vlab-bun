import docker from "@worker/lib/docker";
import type { RpcServer } from "./server";

export function registerDockerHandlers(server: RpcServer) {
	server.on("docker:pullImage", async (ctx) => {
		try {
			const { image } = ctx.payload;

			await new Promise<void>((resolve, reject) => {
				docker.pull(
					image,
					{},
					(err: Error | null, stream: NodeJS.ReadableStream | undefined) => {
						if (err || !stream)
							return reject(err ?? new Error("Image pull failed"));
						docker.modem.followProgress(stream, (err: Error | null) => {
							if (err) return reject(err);
							resolve();
						});
					},
				);
			});
			return true;
		} catch (error) {
			console.error(`Failed to pull image ${ctx.payload.image}:`, error);
			throw new Error(
				`Docker pull failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	});
}
