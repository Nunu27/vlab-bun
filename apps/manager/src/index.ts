export {};

const commands: Record<string, () => Promise<void>> = {
	serve: async () => {
		const { startServer } = await import("./server");
		await startServer();
	},
	seed: async () => {
		const { runSeeder } = await import("./seeders");
		await runSeeder();
	},
	backup: async () => {
		const { runBackup } = await import("./commands/backup");
		await runBackup();
	},
	restore: async () => {
		const { runRestore } = await import("./commands/restore");
		await runRestore();
	},
	"reset-sessions": async () => {
		const { runResetSessions } = await import("./commands/reset-sessions");
		await runResetSessions();
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
	console.error(
		"  bun run src/index.ts backup   Backup database and S3 to lab_backup/",
	);
	console.error(
		"  bun run src/index.ts restore         Restore database and S3 from lab_backup/",
	);
	console.error(
		"  bun run src/index.ts reset-sessions  Clear all lab sessions from the database",
	);
	process.exit(1);
}

await handler();
