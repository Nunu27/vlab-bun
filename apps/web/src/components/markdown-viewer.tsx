import { cn } from "@web/lib/utils";
import { Component, type ComponentType, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";

// react-markdown's `Components` type only covers standard HTML tags. The one
// custom MDX tag we render, <LabChecks value="..." /> (from lab instructions
// authored in the editor), parses down to a lowercase `labchecks` element —
// extend the type so a renderer can be given for it.
type ExtendedComponents = Components & {
	labchecks?: ComponentType<{ value?: string; node?: unknown }>;
};

type MdxJsxAttribute = {
	type: string;
	name?: string;
	value?: unknown;
};

type MdxJsxNode = {
	name?: string | null;
	attributes: MdxJsxAttribute[];
};

// Custom JSX tags (e.g. <LabChecks value="..." />) parse into mdast
// mdxJsx*Element nodes. This maps them to a plain hast element carrying
// only string attributes, so `components` below can render a real React
// component for them — no JS expressions are ever evaluated.
function mdxJsxToHast(_state: unknown, node: MdxJsxNode) {
	if (!node.name) return undefined;

	const properties: Record<string, string> = {};
	for (const attr of node.attributes) {
		if (
			attr.type === "mdxJsxAttribute" &&
			typeof attr.name === "string" &&
			typeof attr.value === "string"
		) {
			properties[attr.name] = attr.value;
		}
	}

	return {
		type: "element" as const,
		tagName: node.name.toLowerCase(),
		properties,
		children: [],
	};
}

class MarkdownErrorBoundary extends Component<
	{ children: ReactNode },
	{ hasError: boolean }
> {
	state = { hasError: false };

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	render() {
		if (this.state.hasError) {
			return (
				<p className="text-muted-foreground text-sm">
					Failed to render this content.
				</p>
			);
		}
		return this.props.children;
	}
}

type MarkdownViewerProps = {
	value?: string;
	className?: string;
	components?: ExtendedComponents;
};

export function MarkdownViewer({
	value,
	className,
	components,
}: MarkdownViewerProps) {
	return (
		<div
			className={cn(
				"prose dark:prose-invert max-w-none overflow-hidden",
				className,
			)}
		>
			<MarkdownErrorBoundary key={value}>
				<ReactMarkdown
					remarkPlugins={[remarkMdx, remarkGfm]}
					remarkRehypeOptions={{
						handlers: {
							mdxJsxTextElement: mdxJsxToHast,
							mdxJsxFlowElement: mdxJsxToHast,
						},
						// drop anything else we don't explicitly handle (e.g. MDX
						// `{expression}` syntax) instead of throwing or executing it
						unknownHandler: () => undefined,
					}}
					components={components}
				>
					{value || ""}
				</ReactMarkdown>
			</MarkdownErrorBoundary>
		</div>
	);
}
