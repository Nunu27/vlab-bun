/**
 * Parses docs/modules/<module>/solution.md into an ordered, executable command
 * list.
 *
 * solution.md is the instructor-facing golden path: the commands that, run in
 * order, should take an empty topology to a fully passing lab. Executing it is
 * what makes the module e2e suite a real test — the previous approach
 * synthesised device config from checks.md and then asserted checks.md, which
 * could never catch a solution (or an instruction) that had drifted.
 */

export type CommandKind = "routeros" | "shell";

export interface SolutionCommand {
	/** Topology node name from the enclosing "## R1 (...)" heading. */
	node: string;
	kind: CommandKind;
	raw: string;
	/** 1-indexed line in solution.md, for actionable failure messages. */
	line: number;
	/** Verification commands (print/ping/show) are parsed but not executed. */
	readOnly: boolean;
}

export interface ParsedSolution {
	commands: SolutionCommand[];
	/** Mutating commands found outside any node section — an authoring error. */
	orphans: { raw: string; line: number; heading: string }[];
	/** Fences whose language is neither routeros nor a shell — also an error. */
	unknownFences: { language: string; line: number; heading: string }[];
}

export interface RouterOSCall {
	path: string;
	params: Record<string, string>;
}

// RouterOS CLI is "<menu path> <action> [item] [key=value ...]". Knowing the
// action verbs is what lets us tell the menu path apart from an item name:
// in "/ip service set telnet disabled=yes", "telnet" identifies the row to
// change, not another level of menu.
const ACTION_VERBS = new Set([
	"add",
	"set",
	"remove",
	"enable",
	"disable",
	"move",
	"print",
	"export",
	"get",
	"find",
	"monitor",
	"unset",
]);

// Bare property names RouterOS accepts as boolean flags, equivalent to
// "<name>=yes" (e.g. "... interfaces=ether2 passive"). Anything else bare
// after a key=value pair is treated as a misplaced item name (see the
// "positional argument after parameters" check below).
const BOOLEAN_FLAG_WORDS = new Set(["passive"]);

const SHELL_LANGUAGES = new Set(["bash", "sh", "shell", "console"]);
const ROUTEROS_LANGUAGES = new Set(["routeros", "mikrotik", "ros"]);

// RouterOS verbs that only read state. Detected anywhere in the command path
// so "/ip route print detail where dst-address=..." is still recognised.
const READ_ONLY_ROUTEROS_VERBS = new Set([
	"print",
	"export",
	"monitor",
	"get",
	"find",
]);

/** Splits on whitespace while respecting quoted values (name="Lab R1"). */
export function tokenize(command: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let quote: string | null = null;

	for (const ch of command) {
		if (quote) {
			if (ch === quote) quote = null;
			else current += ch;
			continue;
		}
		if (ch === '"' || ch === "'") {
			quote = ch;
			continue;
		}
		if (/\s/.test(ch)) {
			if (current) {
				tokens.push(current);
				current = "";
			}
			continue;
		}
		current += ch;
	}

	if (quote) throw new Error(`Unterminated quote in command: ${command}`);
	if (current) tokens.push(current);
	return tokens;
}

export function isReadOnly(kind: CommandKind, command: string): boolean {
	const trimmed = command.trim();

	if (kind === "shell") {
		const withoutSudo = trimmed.replace(/^sudo\s+/, "");
		if (/^(ping|traceroute|tracepath|mtr)\b/.test(withoutSudo)) return true;
		return /\b(show|print)\b/.test(withoutSudo);
	}

	const tokens = tokenize(trimmed);
	if (tokens[0] === "/ping" || tokens[0] === "ping") return true;

	// Parameters (key=value) can carry arbitrary text; only inspect path words.
	return tokens
		.filter((token) => !token.includes("="))
		.some((word) => READ_ONLY_ROUTEROS_VERBS.has(word));
}

/**
 * Converts a RouterOS CLI line into the API path + params that RouterOSClient
 * expects: "/ip address add address=X interface=Y" becomes
 * { path: "/ip/address/add", params: { address: "X", interface: "Y" } }.
 *
 * Throws rather than guessing, so an unsupported command shape fails loudly
 * instead of silently leaving the device unconfigured.
 */
export function toRouterOSCall(command: string): RouterOSCall {
	const trimmed = command.trim();
	const tokens = tokenize(trimmed);

	if (tokens.length === 0) throw new Error("Empty RouterOS command");
	const first = tokens[0] ?? "";
	if (!first.startsWith("/")) {
		throw new Error(`RouterOS command must start with "/": ${trimmed}`);
	}
	tokens[0] = first.slice(1);

	const pathWords: string[] = [];
	const params: Record<string, string> = {};
	let seenAction = false;
	let seenParam = false;

	for (const token of tokens) {
		const eq = token.indexOf("=");
		if (eq > 0) {
			seenParam = true;
			params[token.slice(0, eq)] = token.slice(eq + 1);
			continue;
		}
		if (seenParam) {
			if (BOOLEAN_FLAG_WORDS.has(token)) {
				params[token] = "yes";
				continue;
			}
			throw new Error(
				`Unsupported positional argument "${token}" after parameters: ${trimmed}`,
			);
		}
		if (seenAction) {
			// A bare word after the action names the row to operate on. The API
			// takes that as ".id".
			if (params[".id"] !== undefined) {
				throw new Error(
					`More than one item name given ("${params[".id"]}" and "${token}"): ${trimmed}`,
				);
			}
			params[".id"] = token;
			continue;
		}

		pathWords.push(token);
		if (ACTION_VERBS.has(token)) seenAction = true;
	}

	if (pathWords.length < 2) {
		throw new Error(`Cannot derive an API path and action from: ${trimmed}`);
	}
	if (!seenAction) {
		throw new Error(
			`No RouterOS action verb (add/set/remove/...) found in: ${trimmed}`,
		);
	}

	return { path: `/${pathWords.join("/")}`, params };
}

/** Strips `sudo`, which the images do not need and may not ship. */
export function toShellCommand(command: string): string {
	return command.trim().replace(/^sudo\s+/, "");
}

// Any heading ends the previous node's section. Whether it starts a new one
// depends on its first word being a topology node ("## R1 (MikroTik ...)"),
// so prose sections such as "## Verifikasi & Pengujian" correctly clear it.
const HEADING = /^#{1,6}\s+(.*)$/;
const FENCE = /^```(\w*)/;

export function parseSolution(
	markdown: string,
	knownNodes: string[],
): ParsedSolution {
	const commands: SolutionCommand[] = [];
	const orphans: ParsedSolution["orphans"] = [];
	const unknownFences: ParsedSolution["unknownFences"] = [];

	const nodes = new Set(knownNodes);
	let heading = "(before any heading)";
	let currentNode: string | null = null;
	let fenceKind: CommandKind | null = null;
	let inFence = false;

	const lines = markdown.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const rawLine = lines[i] ?? "";
		const line = rawLine.trim();

		const fence = FENCE.exec(line);
		if (fence) {
			if (inFence) {
				inFence = false;
				fenceKind = null;
				continue;
			}

			inFence = true;
			const language = (fence[1] ?? "").toLowerCase();
			if (ROUTEROS_LANGUAGES.has(language)) fenceKind = "routeros";
			else if (SHELL_LANGUAGES.has(language)) fenceKind = "shell";
			else {
				fenceKind = null;
				unknownFences.push({ language, line: i + 1, heading });
			}
			continue;
		}

		if (inFence) {
			if (!fenceKind || !line) continue;

			if (!currentNode) {
				if (!isReadOnly(fenceKind, line)) {
					orphans.push({ raw: line, line: i + 1, heading });
				}
				continue;
			}

			commands.push({
				node: currentNode,
				kind: fenceKind,
				raw: line,
				line: i + 1,
				readOnly: isReadOnly(fenceKind, line),
			});
			continue;
		}

		const match = HEADING.exec(line);
		if (match) {
			heading = line;
			const candidate = (match[1] ?? "").trim().split(/[\s(]/)[0] ?? "";
			currentNode = nodes.has(candidate) ? candidate : null;
		}
	}

	return { commands, orphans, unknownFences };
}
