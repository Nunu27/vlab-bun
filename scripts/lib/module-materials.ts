import { readdir } from "node:fs/promises";

/**
 * A module ships either a single `material.md`, or several
 * `material-<n>-<slug>.md` files when the theory is long enough to split into
 * separately-downloadable PDFs (e.g. one section per lettered part of
 * instructions.md). Both generate-materials-pdf.ts and
 * sync-command-reference.ts need to agree on exactly this pattern, so it
 * lives here once instead of being reimplemented in each script.
 */
const MATERIAL_FILE_RE = /^material(-\d+-.+)?\.md$/;

/** Sorted so `material-1-*` < `material-2-*` < ... < the bare `material.md`. */
export async function listMaterialFiles(moduleDir: string): Promise<string[]> {
	const entries = await readdir(moduleDir);
	return entries.filter((name) => MATERIAL_FILE_RE.test(name)).sort();
}

/**
 * `material-2-dns.md` -> "dns". Used for naming the generated PDF/attachment
 * when a module has more than one material file; irrelevant for the
 * single-file case, which keeps the module's own name instead.
 */
export function materialSlug(fileName: string): string {
	return fileName.replace(/^material-\d+-/, "").replace(/\.md$/, "");
}
