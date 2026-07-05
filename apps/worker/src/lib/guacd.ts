import { promises as dns } from "node:dns";
import env from "../env";

let resolved: Promise<string> | undefined;

// Resolved lazily (not at import time) so a slow/unavailable DNS server
// doesn't block the whole module graph from loading.
export function resolveGuacdIp() {
	if (env.GUACD_IP) return Promise.resolve(env.GUACD_IP);

	if (!resolved) {
		resolved = dns.lookup(env.GUACD_HOST).then(
			({ address }) => address,
			(error) => {
				resolved = undefined;
				throw new Error(
					`Failed to resolve GUACD_HOST '${env.GUACD_HOST}': ${error instanceof Error ? error.message : error}`,
				);
			},
		);
	}

	return resolved;
}
