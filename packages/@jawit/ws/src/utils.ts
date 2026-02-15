export function compileEventPath(
	event: string,
	params?: Record<string, unknown>,
): string {
	if (!params) return event;
	return Object.entries(params).reduce(
		(path, [key, value]) => path.replace(`[${key}]`, String(value)),
		event,
	);
}
