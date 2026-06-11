import { $ } from "bun";

const containers = process.argv.slice(2);

if (containers.length === 0) {
	console.error(
		"Usage: bun run scripts/get-container-ip.ts <container-name1> [container-name2] ...",
	);
	process.exit(1);
}

for (const container of containers) {
	try {
		const ip =
			await $`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${container}`.text();
		const trimmedIp = ip.trim();
		if (trimmedIp) {
			console.log(`${container}: ${trimmedIp}`);
		} else {
			console.log(
				`${container}: No IP found (container might be stopped or using host network)`,
			);
		}
	} catch (_err) {
		console.error(
			`Failed to get IP for container ${container}. Does it exist?`,
		);
	}
}
