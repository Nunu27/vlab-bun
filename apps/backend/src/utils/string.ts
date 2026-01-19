export function toKebabCase(str: string) {
	return (
		str
			// Insert hyphens before uppercase letters that follow lowercase/numbers
			.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
			// Insert hyphens before uppercase letters followed by lowercase (for acronyms like "XMLParser" -> "XML-Parser")
			.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
			// Replace underscores and spaces with hyphens
			.replace(/[\s_]+/g, "-")
			// Convert to lowercase
			.toLowerCase()
			// Remove any non-alphanumeric characters except hyphens
			.replace(/[^a-z0-9-]/g, "")
			// Collapse multiple hyphens and remove leading/trailing hyphens
			.replace(/-+/g, "-")
			.replace(/^-+|-+$/g, "")
	);
}

export const toTitleCase = (str: string) => {
	return (
		str
			// Insert spaces before uppercase letters that follow lowercase/numbers
			.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
			// Insert spaces before uppercase letters followed by lowercase (for acronyms)
			.replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
			// Replace underscores and hyphens with spaces
			.replace(/[_-]+/g, " ")
			// Split by spaces, filter empty strings, and capitalize each word
			.split(/\s+/)
			.filter((word) => word.length > 0)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(" ")
	);
};
