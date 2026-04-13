import { MarkdownViewer } from "@web/components/markdown-viewer";
import { labCheckViewerDescriptor } from "@web/components/mdx-plugins/lab-checks";
import { ScrollArea } from "@web/components/ui/scroll-area";

export function SessionSidebar({ instructions }: { instructions: string }) {
	return (
		<div className="flex h-full flex-col overflow-hidden border-l bg-background">
			<div className="flex h-full flex-col">
				<ScrollArea className="flex-1 overflow-auto p-4">
					<MarkdownViewer
						value={instructions}
						jsxComponentDescriptors={[labCheckViewerDescriptor]}
					/>
				</ScrollArea>
			</div>
		</div>
	);
}
