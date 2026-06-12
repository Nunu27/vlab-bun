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
		const output =
			await $`docker inspect -f '{{json .NetworkSettings.Networks}}' ${container}`.text();
		const networks = JSON.parse(output) as Record<
			string,
			{ IPAddress: string }
		>;

		const results = Object.entries(networks)
			.map(([name, net]) => `${name} (${net.IPAddress})`)
			.filter(Boolean);

		if (results.length > 0) {
			console.log(`${container}: ${results.join(", ")}`);
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
