import { intro, log, outro } from "@clack/prompts";
import { spawn, spawnSync } from "bun";

const SESSION_NAME = "vlab-dev";
const DIR = process.cwd();

intro("vLab Development Environment");

log.info("Checking prerequisites...");

// 1. Check for tmux
if (!Bun.which("tmux")) {
	log.error("tmux is not installed or not in PATH.");
	log.error(
		"Please install tmux to use the split-pane development environment.",
	);
	log.error("Alternatively, run the standard dev command: bun run dev");
	process.exit(1);
}

// 2. Setup tmux session
const { exitCode } = spawnSync(["tmux", "has-session", "-t", SESSION_NAME]);
if (exitCode !== 0) {
	log.info("Creating new tmux session...");
	// Create new session in manager directory
	spawnSync([
		"tmux",
		"new-session",
		"-d",
		"-s",
		SESSION_NAME,
		"-n",
		"dev",
		"-c",
		`${DIR}/apps/manager`,
	]);

	// Split window horizontally and open in worker directory
	spawnSync([
		"tmux",
		"split-window",
		"-h",
		"-t",
		SESSION_NAME,
		"-c",
		`${DIR}/apps/worker`,
	]);

	// Split again horizontally to get 3 columns, and open in web directory
	spawnSync([
		"tmux",
		"split-window",
		"-h",
		"-t",
		SESSION_NAME,
		"-c",
		`${DIR}/apps/web`,
	]);

	// Equalize pane sizes horizontally
	spawnSync(["tmux", "select-layout", "-t", SESSION_NAME, "even-horizontal"]);
} else {
	log.info("Reusing existing tmux session...");
}

// 3. Find available terminal emulator
const terminals = [
	{
		bin: "ghostty",
		args: ["-e", "tmux", "attach-session", "-t", SESSION_NAME],
	},
	{
		bin: "alacritty",
		args: ["-e", "tmux", "attach-session", "-t", SESSION_NAME],
	},
	{ bin: "kitty", args: ["tmux", "attach-session", "-t", SESSION_NAME] },
	{
		bin: "wezterm",
		args: ["start", "--", "tmux", "attach-session", "-t", SESSION_NAME],
	},
	{
		bin: "konsole",
		args: ["-e", "tmux", "attach-session", "-t", SESSION_NAME],
	},
	{
		bin: "gnome-terminal",
		args: ["--", "tmux", "attach-session", "-t", SESSION_NAME],
	},
	{
		bin: "x-terminal-emulator",
		args: ["-e", "tmux", "attach-session", "-t", SESSION_NAME],
	},
	{ bin: "xterm", args: ["-e", "tmux", "attach-session", "-t", SESSION_NAME] },
];

let selectedTerm: { bin: string; args: string[] } | null = null;

for (const t of terminals) {
	if (Bun.which(t.bin)) {
		selectedTerm = t;
		break;
	}
}

if (!selectedTerm && process.platform === "darwin") {
	// Fallback to macOS Terminal app via osascript
	selectedTerm = {
		bin: "osascript",
		args: [
			"-e",
			`tell app "Terminal" to do script "tmux attach-session -t ${SESSION_NAME}"`,
		],
	};
}

if (selectedTerm) {
	log.success(`Launching terminal: ${selectedTerm.bin}`);

	if (selectedTerm.bin === "osascript") {
		spawnSync(["osascript", ...selectedTerm.args]);
	} else {
		// Spawn terminal in detached mode so it survives if this script exits
		const child = spawn([selectedTerm.bin, ...selectedTerm.args], {
			detached: true,
			stdio: ["ignore", "ignore", "ignore"],
		});
		child.unref();
	}

	outro("Development environment is ready!");
} else {
	log.warn("No known terminal emulator found.");
	log.message("Please attach to the tmux session manually by running:");
	log.message(`\n  tmux attach-session -t ${SESSION_NAME}\n`);
	outro("Session created, but waiting for manual attachment.");
}
