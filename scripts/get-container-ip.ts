import { intro, log, outro, spinner } from "@clack/prompts";
import { $ } from "bun";

const containers = process.argv.slice(2);

intro("vLab Container IP Finder");

if (containers.length === 0) {
	log.error(
		"Usage: bun run scripts/get-container-ip.ts <container-name1> [container-name2] ...",
	);
	process.exit(1);
}

const s = spinner();
s.start("Fetching container IPs...");

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
			log.success(`${container}: ${results.join(", ")}`);
		} else {
			log.warn(
				`${container}: No IP found (container might be stopped or using host network)`,
			);
		}
	} catch (_err) {
		log.error(`Failed to get IP for container ${container}. Does it exist?`);
	}
}

s.stop("Finished fetching IPs");
outro("Done!");
