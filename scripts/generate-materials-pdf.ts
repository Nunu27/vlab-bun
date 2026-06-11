import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";

const docsDir = "docs/modules";
const outDir = "out/materials";

async function main() {
	// Ensure output directory exists
	await mkdir(outDir, { recursive: true });

	let modules: string[] = [];
	try {
		modules = await readdir(docsDir);
	} catch (_err) {
		console.error(`Failed to read directory: ${docsDir}`);
		process.exit(1);
	}

	if (modules.length === 0) {
		console.log("No modules found.");
		return;
	}

	console.log(`Found ${modules.length} modules. Generating PDFs...`);

	for (const mod of modules) {
		const materialPath = join(docsDir, mod, "material.md");
		if (existsSync(materialPath)) {
			console.log(`\n⏳ Generating PDF for module: ${mod}...`);
			try {
				await $`bunx md-to-pdf --stylesheet scripts/pdf-style.css ${materialPath}`;
				const generatedPdfPath = join(docsDir, mod, "material.pdf");
				const targetPdfPath = join(outDir, `${mod}.pdf`);
				await $`mv ${generatedPdfPath} ${targetPdfPath}`;
				console.log(`✅ Saved successfully to ${targetPdfPath}`);
			} catch (err) {
				console.error(`❌ Failed to generate PDF for ${mod}`);
				console.error(err);
			}
		} else {
			console.log(`⚠️ No material.md found in ${mod}, skipping...`);
		}
	}

	console.log("\n🎉 All PDF generation tasks completed.");
}

main();
