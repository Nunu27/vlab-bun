import {
	headingsPlugin,
	imagePlugin,
	type JsxComponentDescriptor,
	jsxPlugin,
	linkPlugin,
	listsPlugin,
	MDXEditor,
	markdownShortcutPlugin,
	quotePlugin,
	tablePlugin,
	thematicBreakPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { cn } from "@web/lib/utils";
import { useTheme } from "./theme-provider";

type MarkdownViewerProps = {
	value?: string;
	className?: string;
	jsxComponentDescriptors?: JsxComponentDescriptor[];
};

export function MarkdownViewer({
	value,
	className,
	jsxComponentDescriptors = [],
}: MarkdownViewerProps) {
	const { theme } = useTheme();

	return (
		<div className={cn("max-w-none overflow-hidden", className)}>
			<MDXEditor
				readOnly={true}
				className={theme === "dark" ? "dark-theme" : undefined}
				markdown={value || ""}
				contentEditableClassName="prose dark:prose-invert max-w-none min-h-0"
				plugins={[
					jsxPlugin({ jsxComponentDescriptors }),
					listsPlugin(),
					quotePlugin(),
					headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
					linkPlugin(),
					imagePlugin(),
					tablePlugin(),
					thematicBreakPlugin(),
					markdownShortcutPlugin(),
				]}
			/>
		</div>
	);
}
