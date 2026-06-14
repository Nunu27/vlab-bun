import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { intro, log, outro, spinner } from "@clack/prompts";
import { $ } from "bun";

const docsDir = "docs/modules";
const outDir = "out/materials";

async function main() {
	intro("vLab Materials PDF Generator");

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
		const materialPath = join(docsDir, mod, "material.md");
		if (existsSync(materialPath)) {
			const s = spinner();
			s.start(`Generating PDF for module: ${mod}...`);
			try {
				await $`bunx md-to-pdf --stylesheet scripts/pdf-style.css ${materialPath}`.quiet();
				const generatedPdfPath = join(docsDir, mod, "material.pdf");
				const targetPdfPath = join(outDir, `${mod}.pdf`);
				await $`mv ${generatedPdfPath} ${targetPdfPath}`;
				s.stop(`Saved successfully to ${targetPdfPath}`);
			} catch (err) {
				s.stop(`Failed to generate PDF for ${mod}`);
				console.error(err);
			}
		} else {
			log.warn(`No material.md found in ${mod}, skipping...`);
		}
	}

	outro("All PDF generation tasks completed.");
}

main();
