import type { MdastJsx } from "@mdxeditor/editor";
import { useMemo } from "react";

export function useLabCheckValue(node: MdastJsx) {
	const attribute = node.attributes.find(
		(attr) => attr.type === "mdxJsxAttribute" && attr.name === "value",
	);

	return useMemo(() => {
		if (typeof attribute?.value !== "string" || attribute.value.trim() === "") {
			return [];
		} else return attribute.value.split(",");
	}, [attribute]);
}

export function formatLabCheck(text: string, params: Record<string, unknown>) {
	return text.replace(/\{([^}]+)\}/g, (_, key) => {
		const value = params[key];
		if (value === undefined) return "??";
		return `\`${value}\``;
	});
}
