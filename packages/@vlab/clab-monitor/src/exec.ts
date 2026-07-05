import { createInterface } from "node:readline";
import { PassThrough } from "node:stream";
import type Dockerode from "dockerode";

export async function execStream(
	docker: Dockerode,
	container: Dockerode.Container,
	cmd: string[],
): Promise<PassThrough> {
	const exec = await container.exec({
		Cmd: cmd,
		AttachStdout: true,
		AttachStderr: false,
		Tty: false,
	});
	const raw = await exec.start({ stdin: false, Tty: false });

	const stdout = new PassThrough();
	docker.modem.demuxStream(raw, stdout, stdout);
	raw.on("close", () => stdout.end());
	raw.on("error", (err) => stdout.destroy(err));

	// destroying the demuxed stream should also tear down the exec connection
	const destroy = stdout.destroy.bind(stdout);
	stdout.destroy = (err?: Error) => {
		raw.destroy();
		return destroy(err);
	};

	return stdout;
}

export async function execOutput(
	docker: Dockerode,
	container: Dockerode.Container,
	cmd: string[],
): Promise<string> {
	const stream = await execStream(docker, container, cmd);
	const chunks: Buffer[] = [];

	for await (const chunk of stream) chunks.push(chunk as Buffer);

	return Buffer.concat(chunks).toString("utf8");
}

export async function execLines(
	docker: Dockerode,
	container: Dockerode.Container,
	cmd: string[],
	onLine: (line: string) => void,
	onError?: (err: Error) => void,
): Promise<PassThrough> {
	const stream = await execStream(docker, container, cmd);
	const rl = createInterface({ input: stream });

	rl.on("line", onLine);
	rl.on("close", () => stream.destroy());

	// a stream with zero "error" listeners crashes the process on emit
	stream.on("error", (err) => {
		rl.close();
		onError?.(err);
	});

	return stream;
}
