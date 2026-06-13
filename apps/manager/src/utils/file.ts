export function extractEmbeddedFiles(...texts: string[]): string[] {
	// The Regex matches exactly /file/<filename> and extracts <filename>
	// where <filename> is alphanumeric, dashes, underscores, and dots.
	const regex = /\/file\/([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)/g;
	const matches: string[] = [];

	for (const text of texts) {
		if (!text) continue;
		for (const match of text.matchAll(regex)) {
			matches.push(match[1]);
		}
	}

	return [...new Set(matches)];
}
