import logger from "./lib/logger";

// The manager is a shared, multi-tenant process (every connected student, every
// worker's grpc stream); unlike the worker, crashing here on any stray unhandled
// rejection takes down everyone, not just one session. Log and keep running rather
// than exit; Bun's default behavior for an unhandled rejection is to crash the
// process, and this codebase has fire-and-forget async calls that can throw.
process.on("unhandledRejection", (reason) => {
	logger.error({ err: reason }, "Unhandled Rejection");
});
process.on("uncaughtException", (error) => {
	logger.error({ err: error }, "Uncaught Exception");
});

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
	"clear-sessions": async () => {
		const { runClearSessions } = await import("./commands/clear-sessions");
		const nrp = process.argv[3];
		await runClearSessions(nrp);
	},
	"sync-modules": async () => {
		const { runSyncModules } = await import("./commands/sync-modules");
		await runSyncModules();
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
	console.error(
		"  bun run src/index.ts clear-sessions [nrp]  Clear submitted lab sessions, optionally by NRP",
	);
	console.error(
		"  bun run src/index.ts sync-modules    Sync lab modules from docs/modules to the database",
	);
	process.exit(1);
}

await handler();
