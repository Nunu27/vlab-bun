/**
 * Copies each module's "Referensi Perintah" section from material.md into
 * instructions.md, so a student running the lab has the command table in the
 * same pane as the steps instead of switching to the material PDF.
 *
 * material.md stays the single source of truth: this script only writes, and
 * module-docs.test.ts fails if the copy drifts. Re-run it after editing any
 * reference table.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { intro, log, outro } from "@clack/prompts";

const DOCS_DIR = resolve(import.meta.dir, "../docs/modules");

export const START = "<!-- command-reference:start -->";
export const END = "<!-- command-reference:end -->";

/**
 * Lifts the trailing "## Referensi Perintah" section out of material.md and
 * re-levels it to sit alongside instructions.md's lettered sections.
 */
export function extractReference(material: string): string | undefined {
	const start = material.indexOf("\n## Referensi Perintah");
	if (start === -1) return undefined;

	const body = material.slice(start + 1).trimEnd();

	// Demote the sub-headings first: renaming the top one first would let the
	// demotion pass hit the line it had just written.
	return body
		.replace(/^### /gm, "#### ")
		.replace(/^## Referensi Perintah/, "### B. Referensi Perintah");
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

function main() {
	intro("Sync command reference into instructions");

	const modules = readdirSync(DOCS_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();

	let updated = 0;

	for (const mod of modules) {
		const materialPath = join(DOCS_DIR, mod, "material.md");
		const instructionsPath = join(DOCS_DIR, mod, "instructions.md");

		const reference = extractReference(readFileSync(materialPath, "utf-8"));
		if (!reference) {
			log.warn(`${mod}: material.md has no "## Referensi Perintah" section`);
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
