import { existsSync } from "node:fs";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { intro, log, outro, spinner } from "@clack/prompts";
import { $ } from "bun";
import { listMaterialFiles, materialSlug } from "./lib/module-materials";

const docsDir = "docs/modules";
const outDir = "out/materials";
const configFile = "scripts/pdf-config.cjs";

/**
 * md-to-pdf require()s the config file, and when that throws it logs to stderr,
 * exits 0, and emits a completely unstyled PDF. Loading it here first turns
 * that into a hard failure with the real error attached.
 */
async function assertConfigLoads() {
	try {
		await import(resolve(configFile));
	} catch (err) {
		log.error(
			`${configFile} could not be loaded — md-to-pdf would silently fall back to its default styling.`,
		);
		throw err;
	}
}

// md-to-pdf resolves relative image paths against --basedir, not against the
// markdown file's own directory. Without the flag an `![](diagram.png)` next to
// material.md is looked up from the repo root, and Chrome silently renders a
// broken-image icon: the PDF is still produced and the exit code is still 0.
// This scans for local images up front so that failure is loud instead.
const IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)/g;

function findMissingImages(markdown: string, moduleDir: string): string[] {
	const missing: string[] = [];

	for (const [, src] of markdown.matchAll(IMAGE_RE)) {
		// Remote and inline images are resolved by Chrome, not from disk.
		if (!src || /^(https?:|data:)/.test(src)) continue;
		if (!existsSync(join(moduleDir, src))) missing.push(src);
	}

	return missing;
}

async function main() {
	intro("vLab Materials PDF Generator");

	await assertConfigLoads();

	// Ensure output directory exists
	await mkdir(outDir, { recursive: true });

	let modules: string[] = [];
	try {
		modules = await readdir(docsDir);
	} catch (_err) {
		log.error(`Failed to read directory: ${docsDir}`);
		process.exit(1);
	}

	if (modules.length === 0) {
		log.info("No modules found.");
		return;
	}

	log.info(`Found ${modules.length} modules. Generating PDFs...`);

	for (const mod of modules) {
		const moduleDir = join(docsDir, mod);
		const materialFiles = await listMaterialFiles(moduleDir);

		if (materialFiles.length === 0) {
			log.warn(`No material.md found in ${mod}, skipping...`);
			continue;
		}

		// A module with exactly one material file keeps today's plain
		// `${mod}.pdf` name; a module split into several materials (e.g.
		// material-1-eksplorasi.md, material-2-dns.md) gets one PDF per file,
		// named after its own slug so they don't collide.
		const single = materialFiles.length === 1;

		for (const materialFile of materialFiles) {
			const materialPath = join(moduleDir, materialFile);
			const label = single ? mod : `${mod} (${materialSlug(materialFile)})`;

			const s = spinner();
			s.start(`Generating PDF for module: ${label}...`);
			try {
				const content = await readFile(materialPath, "utf-8");
				const titleMatch = content.match(/^#\s+(.+)$/m);
				const title = titleMatch?.[1]?.trim() ?? mod;

				const missing = findMissingImages(content, moduleDir);
				if (missing.length > 0) {
					s.stop(`Missing images in ${label}`);
					log.error(
						`${label}: image not found, would render as a broken icon:\n  ${missing.join("\n  ")}`,
					);
					continue;
				}

				// pdf-config.cjs carries the stylesheet, page size, margins and the
				// running header/footer. --document-title feeds the header's title.
				await $`bunx md-to-pdf --config-file ${configFile} --basedir ${moduleDir} --document-title ${title} ${materialPath}`.quiet();

				// md-to-pdf writes its output next to the input, replacing .md with
				// .pdf (e.g. material-2-dns.md -> material-2-dns.pdf).
				const generatedPdfPath = materialPath.replace(/\.md$/, ".pdf");
				const targetPdfPath = join(
					outDir,
					single ? `${mod}.pdf` : `${mod}--${materialSlug(materialFile)}.pdf`,
				);
				await $`mv ${generatedPdfPath} ${targetPdfPath}`;
				s.stop(`Saved successfully to ${targetPdfPath}`);
			} catch (err) {
				s.stop(`Failed to generate PDF for ${label}`);
				console.error(err);
			}
		}
	}

	outro("All PDF generation tasks completed.");
}

main();
