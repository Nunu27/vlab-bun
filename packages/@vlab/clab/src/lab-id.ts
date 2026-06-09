import { InvalidLabIdError } from "./errors";

export function validateLabId(id: string) {
	if (
		id.length === 0 ||
		id === "." ||
		id === ".." ||
		id.includes("..") ||
		id.includes("/") ||
		id.includes("\\") ||
		id.includes("\0") ||
		!/^[A-Za-z0-9_.-]+$/.test(id)
	) {
		throw new InvalidLabIdError(id);
	}
}
