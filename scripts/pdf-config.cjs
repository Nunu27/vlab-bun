/**
 * Page setup for the module material PDFs.
 *
 * Running headers and page numbers cannot come from CSS: Chrome does not
 * implement `@page` margin boxes, so the only way to get them is Puppeteer's
 * header/footer templates, which render in their own context and need inline
 * styles and an explicit font-size (they default to ~6px and inherit nothing).
 *
 * `.title` is filled from the document title, which the generator passes per
 * module via --document-title.
 *
 * Must stay .cjs: the package is `"type": "module"`, md-to-pdf loads this with
 * require(), and on failure it logs to stderr, exits 0, and silently emits an
 * unstyled PDF. generate-materials-pdf.ts pre-loads it so that cannot happen
 * quietly.
 */

const furniture =
	"font-family: 'DejaVu Sans', 'Liberation Sans', Helvetica, sans-serif;" +
	"font-size: 8pt; color: #8a887e; width: 100%;";

module.exports = {
	stylesheet: ["scripts/pdf-style.css"],

	pdf_options: {
		format: "A4",
		printBackground: true,
		// Top/bottom leave room for the running header and the page number.
		margin: {
			top: "22mm",
			bottom: "20mm",
			left: "24mm",
			right: "24mm",
		},
		displayHeaderFooter: true,
		headerTemplate: `<div style="${furniture} padding: 0 24mm;">
			<div style="border-bottom: 0.5px solid #d8d5cc; padding-bottom: 3px; text-align: right;">
				<span class="title"></span>
			</div>
		</div>`,
		footerTemplate: `<div style="${furniture} padding: 0 24mm; text-align: center;">
			<span class="pageNumber"></span>
		</div>`,
	},
};
