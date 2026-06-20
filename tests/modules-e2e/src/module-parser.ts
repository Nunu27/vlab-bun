import fs from "node:fs/promises";
import path from "node:path";

export interface TopologyMarkdownDevice {
	template: string;
	x: number;
	y: number;
	credentials?: { username?: string; password?: string };
	resources?: { cpu?: number | null; memory?: string | null };
}

export interface TopologyMarkdownLink {
	from: string;
	interface: string;
	to: string;
	remoteInterface: string;
}

export interface TopologyMarkdown {
	devices: Record<string, TopologyMarkdownDevice>;
	links: TopologyMarkdownLink[];
	groups: Record<string, unknown>;
	notes: unknown[];
}

export interface ParsedCheck {
	id: string;
	checkId: string;
	targetNode: string;
	params: Record<string, string>;
	weight: number;
}

export interface ParsedModule {
	name: string;
	title: string;
	topology: TopologyMarkdown;
	checks: ParsedCheck[];
}

export async function parseModule(modulePath: string): Promise<ParsedModule> {
	const name = path.basename(modulePath);

	let desc = "";
	try {
		desc = await fs.readFile(path.join(modulePath, "description.md"), "utf-8");
	} catch {
		// no description.md
	}

	const titleMatch = desc.match(/^#\s+(.+)$/m);
	const title = titleMatch?.[1]?.trim() ?? name;

	const inst = await fs.readFile(
		path.join(modulePath, "instructions.md"),
		"utf-8",
	);

	const topologyBlockMatch = inst.match(/^<!--\s*topology\n([\s\S]*?)\n-->/m);
	if (!topologyBlockMatch?.[1]) {
		throw new Error(`No topology block found in ${name}/instructions.md`);
	}

	const topology = JSON.parse(topologyBlockMatch[1]) as TopologyMarkdown;

	let checksMd = "";
	try {
		checksMd = await fs.readFile(path.join(modulePath, "checks.md"), "utf-8");
	} catch {
		// no checks.md
	}

	const checks: ParsedCheck[] = [];
	for (const line of checksMd.split("\n")) {
		const trimmed = line.trim();
		if (
			!trimmed.startsWith("|") ||
			trimmed.startsWith("| Check ID") ||
			trimmed.startsWith("|---")
		) {
			continue;
		}

		const parts = trimmed
			.split("|")
			.map((p) => p.trim())
			.filter(Boolean);
		if (parts.length !== 4) continue;

		const checkId = parts[0]?.replace(/`/g, "");
		const targetNode = parts[1]?.replace(/`/g, "");
		const paramsStr = parts[2]!;
		const weight = parseInt(parts[3]!, 10) || 1;

		const params: Record<string, string> = {};
		for (const p of paramsStr.split(/<br>|,\s+/).map((s) => s.trim())) {
			if (!p.includes(":")) continue;
			const colonIdx = p.indexOf(":");
			const k = p.slice(0, colonIdx).replace(/\*\*/g, "").trim();
			const v = p.slice(colonIdx + 1).trim();
			params[k] = v;
		}

		checks.push({
			id: `${targetNode}-${checkId.replace(/\./g, "-")}-${checks.length}`,
			checkId,
			targetNode,
			params,
			weight,
		});
	}

	return { name, title, topology, checks };
}
