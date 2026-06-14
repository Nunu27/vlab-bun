import Docker from "dockerode";

async function main() {
	const docker = new Docker();
	const containers = await docker.listContainers();
	const linux1 = containers.find((c) =>
		c.Names.some((n) => n.includes("linux1")),
	);
	if (!linux1) {
		console.log("linux1 not found");
		return;
	}

	const container = docker.getContainer(linux1.Id);
	const exec = await container.exec({
		Cmd: ["which", "inotifywait"],
		AttachStdout: true,
		AttachStderr: true,
	});

	const stream = await exec.start({ Detach: false, Tty: false });
	docker.modem.demuxStream(stream, process.stdout, process.stderr);
}
main();
