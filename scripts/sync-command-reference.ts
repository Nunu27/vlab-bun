/**
 * Copies each module's "Referensi Perintah" section(s) from its material
 * file(s) into instructions.md, so a student running the lab has the command
 * table in the same pane as the steps instead of switching to the material
 * PDF.
 *
 * The material file(s) stay the single source of truth: this script only
 * writes, and module-docs.test.ts fails if the copy drifts. Re-run it after
 * editing any reference table.
 *
 * Most modules ship one material.md. A module split into several
 * material-<n>-<slug>.md files (one PDF per section) gets its files'
 * reference tables concatenated into the same single instructions.md block,
 * each grouped under its own material's title.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { intro, log, outro } from "@clack/prompts";
import { listMaterialFiles } from "./lib/module-materials";

const DOCS_DIR = resolve(import.meta.dir, "../docs/modules");

export const START = "<!-- command-reference:start -->";
export const END = "<!-- command-reference:end -->";

/** The raw "## Referensi Perintah" section, heading included, undemoted. */
function referenceBody(material: string): string | undefined {
	const start = material.indexOf("\n## Referensi Perintah");
	if (start === -1) return undefined;
	return material.slice(start + 1).trimEnd();
}

/**
 * Lifts the trailing "## Referensi Perintah" section out of a material file
 * and re-levels it to sit alongside instructions.md's lettered sections.
 */
export function extractReference(material: string): string | undefined {
	const body = referenceBody(material);
	if (body === undefined) return undefined;

	// Demote the sub-headings first: renaming the top one first would let the
	// demotion pass hit the line it had just written.
	return body
		.replace(/^### /gm, "#### ")
		.replace(/^## Referensi Perintah/, "### B. Referensi Perintah");
}

/**
 * Same as extractReference, but for a module split across several material
 * files. Reduces to extractReference's exact output when there's only one
 * file, so single-material modules see no change at all.
 */
export async function buildCombinedReference(
	moduleDir: string,
): Promise<string | undefined> {
	const files = await listMaterialFiles(moduleDir);
	if (files.length === 0) return undefined;

	if (files.length === 1) {
		const [only] = files;
		if (!only) return undefined;
		const content = await readFile(join(moduleDir, only), "utf-8");
		return extractReference(content);
	}

	const sections: string[] = [];
	for (const file of files) {
		const content = await readFile(join(moduleDir, file), "utf-8");
		const body = referenceBody(content);
		if (body === undefined) continue;

		const titleMatch = content.match(/^#\s+(.+)$/m);
		const title = titleMatch?.[1]?.trim() ?? file;

		// Drop the material's own "## Referensi Perintah" heading in favor of
		// its own title as the grouping heading, and demote sub-headings one
		// level further than the single-material case (### -> #####) so
		// several materials' "Linux"/"RouterOS" tables read as distinct
		// groups instead of looking like duplicates.
		const withoutHeading = body.replace(/^## Referensi Perintah\n*/, "");
		const demoted = withoutHeading.replace(/^### /gm, "##### ");
		sections.push(`#### ${title}\n\n${demoted}`.trimEnd());
	}

	if (sections.length === 0) return undefined;

	return `### B. Referensi Perintah\n\n${sections.join("\n\n")}`;
}

/** The steps section, whichever letter it currently carries. */
const STEPS_HEADING = /^### [A-Z]\. (Langkah-Langkah .*)$/m;

/** Any previously injected block, plus the blank lines around it. */
const EXISTING_BLOCK = new RegExp(`\\n*${START}[\\s\\S]*?${END}\\n*`);

/**
 * Places the reference between the scenario and the steps rather than at the
 * end. In the session sidebar a trailing appendix means scrolling past every
 * remaining step to reach it and losing your place coming back; next to the
 * addressing table it forms a single lookup zone the student already scrolls
 * to. The steps section is renumbered to C to keep A/B/C reading order.
 *
 * Idempotent: re-running strips the old block before inserting the new one.
 */
export function injectReference(
	instructions: string,
	reference: string,
): string {
	const stripped = `${instructions.replace(EXISTING_BLOCK, "\n\n").trimEnd()}\n`;

	const steps = stripped.match(STEPS_HEADING);
	if (!steps) {
		throw new Error('no "### <letter>. Langkah-Langkah ..." heading found');
	}

	const block = `${START}\n\n${reference}\n\n${END}`;
	return stripped.replace(STEPS_HEADING, `${block}\n\n### C. ${steps[1]}`);
}

async function main() {
	intro("Sync command reference into instructions");

	const modules = (await readdir(DOCS_DIR, { withFileTypes: true }))
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();

	let updated = 0;

	for (const mod of modules) {
		const moduleDir = join(DOCS_DIR, mod);
		const instructionsPath = join(moduleDir, "instructions.md");

		const reference = await buildCombinedReference(moduleDir);
		if (!reference) {
			log.warn(
				`${mod}: no material file has a "## Referensi Perintah" section`,
			);
			continue;
		}

		const before = readFileSync(instructionsPath, "utf-8");
		const after = injectReference(before, reference);

		if (after === before) {
			log.info(`${mod}: already in sync`);
			continue;
		}

		writeFileSync(instructionsPath, after);
		log.success(`${mod}: reference updated`);
		updated++;
	}

	outro(`${updated} of ${modules.length} modules updated.`);
}

if (import.meta.main) main();
