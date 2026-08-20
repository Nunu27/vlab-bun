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

export interface ParsedLabCheckTag {
	node: string;
	checkId: string;
	/** 1-indexed line in instructions.md, for actionable failure messages. */
	line: number;
}

export interface ParsedModule {
	name: string;
	title: string;
	topology: TopologyMarkdown;
	checks: ParsedCheck[];
	tags: ParsedLabCheckTag[];
}

const LAB_CHECK_TAG = /<LabCheck\s+([^>]*?)\/?>/g;

/**
 * Scrapes <LabCheck node="..." id="..." /> tags from instructions.md in
 * document order. The platform binds these to checks.md rows positionally,
 * so order is the contract and must be preserved exactly.
 *
 * Fenced code blocks and HTML comments (the topology block) are skipped so
 * example markup can never be mistaken for a real anchor.
 */
export function parseLabCheckTags(markdown: string): ParsedLabCheckTag[] {
	const tags: ParsedLabCheckTag[] = [];
	let inFence = false;
	let inComment = false;

	const lines = markdown.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const trimmed = line.trim();

		if (trimmed.startsWith("```")) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		if (inComment) {
			if (trimmed.includes("-->")) inComment = false;
			continue;
		}
		if (trimmed.startsWith("<!--") && !trimmed.includes("-->")) {
			inComment = true;
			continue;
		}

		LAB_CHECK_TAG.lastIndex = 0;
		let match = LAB_CHECK_TAG.exec(line);
		while (match) {
			const attrs = match[1] ?? "";
			const node = attrs.match(/node="([^"]*)"/)?.[1];
			const checkId = attrs.match(/id="([^"]*)"/)?.[1];

			if (!node || !checkId) {
				throw new Error(
					`Malformed LabCheck tag at line ${i + 1}: "${match[0]}" (needs both node and id)`,
				);
			}

			tags.push({ node, checkId, line: i + 1 });
			match = LAB_CHECK_TAG.exec(line);
		}
	}

	return tags;
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

		const [rawCheckId, rawTargetNode, paramsStr, weightStr] = parts;
		const checkId = rawCheckId?.replace(/`/g, "");
		const targetNode = rawTargetNode?.replace(/`/g, "");
		if (
			!checkId ||
			!targetNode ||
			paramsStr === undefined ||
			weightStr === undefined
		) {
			throw new Error(`Malformed check row in ${name}/checks.md: "${trimmed}"`);
		}
		const weight = parseInt(weightStr, 10) || 1;

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

	return { name, title, topology, checks, tags: parseLabCheckTags(inst) };
}
