export function toKebabCase(str: string) {
	return str
		.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2")
		.toLowerCase()
		.replace(/[^a-zA-Z0-9 -]/g, "")
		.replace(/\s+/g, "-")
		.replace(/_+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export const toTitleCase = (str: string) => {
	return str
		.toLowerCase()
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
};
