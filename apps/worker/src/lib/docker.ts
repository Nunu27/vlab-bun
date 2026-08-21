import Docker from "dockerode";

const docker = new Docker();

const pullingImages = new Map<string, Promise<unknown>>();

export function pullImage(image: string) {
	const inFlight = pullingImages.get(image);
	if (inFlight) return inFlight;

	const promise = (async () => {
		try {
			const pullStream = await docker.pull(image);
			await new Promise((resolve, reject) => {
				docker.modem.followProgress(pullStream, (err, res) =>
					err ? reject(err) : resolve(res),
				);
			});
		} finally {
			pullingImages.delete(image);
		}
	})();

	pullingImages.set(image, promise);
	return promise;
}

export default docker;
