import {
	headingsPlugin,
	imagePlugin,
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
};

export function MarkdownViewer({ value, className }: MarkdownViewerProps) {
	const { theme } = useTheme();

	return (
		<div className={cn("max-w-none overflow-hidden", className)}>
			<MDXEditor
				readOnly={true}
				className={theme === "dark" ? "dark-theme" : undefined}
				markdown={value || ""}
				contentEditableClassName="prose dark:prose-invert min-h-0"
				plugins={[
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
