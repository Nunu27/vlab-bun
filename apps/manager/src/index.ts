import { runSeeder } from "./seeders";
import { startServer } from "./server";

const commands: Record<string, () => Promise<void>> = {
	serve: async () => {
		await startServer();
	},
	seed: async () => {
		await runSeeder();
	},
};

const command = process.argv[2] ?? "serve";
const handler = commands[command];

if (!handler) {
	console.error(`Unknown command: "${command}"`);
	console.error();
	console.error("Usage:");
	console.error("  bun run src/index.ts [serve]  Start the API server");
	console.error("  bun run src/index.ts seed     Run database seeders");
	process.exit(1);
}

await handler();
