import { MarkdownViewer } from "@web/components/markdown-viewer";
import { labCheckViewerDescriptor } from "@web/components/mdx-plugins/lab-checks";
import { ScrollArea } from "@web/components/ui/scroll-area";
import { LabAttachmentsCard } from "@web/routes/_dashboard/-module/components/cards/lab-attachments-card";

export function SessionSidebar({
	instructions,
	attachments,
}: {
	instructions: string;
	attachments: { name: string; file: string }[];
}) {
	return (
		<div
			data-tour="instructions-panel"
			className="flex h-full flex-col overflow-hidden border-l bg-background"
		>
			<div className="flex h-full flex-col">
				<ScrollArea className="flex-1 overflow-auto">
					<div className="px-4 pt-4">
						<LabAttachmentsCard attachments={attachments} />
					</div>
					<MarkdownViewer
						className="p-4"
						value={instructions}
						jsxComponentDescriptors={[labCheckViewerDescriptor]}
					/>
				</ScrollArea>
			</div>
		</div>
	);
}
