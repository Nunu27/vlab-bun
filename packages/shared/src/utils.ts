export const sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export function chunk<T>(array: T[], size: number): T[][] {
	if (size <= 0) throw new Error("Chunk size must be greater than 0");

	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}

	return chunks;
}
