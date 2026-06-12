import docker from "@worker/lib/docker";
import type { RpcServer } from "./server";

export function registerDockerHandlers(server: RpcServer) {
	server.on("docker:pullImage", async (ctx) => {
		const { image } = ctx.payload;

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
}
