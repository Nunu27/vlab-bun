import env from "@manager/env";

export async function runHealthcheck() {
	try {
		const response = await fetch(`http://127.0.0.1:${env.PORT}/api/`);
		if (!response.ok) throw new Error(`unexpected status ${response.status}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("Healthcheck failed:", message);
		process.exit(1);
	}
}
