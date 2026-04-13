import { MarkdownViewer } from "@web/components/markdown-viewer";
import { labCheckReadonlyEditorDescriptor } from "@web/components/mdx-plugins/lab-checks";
import { Card, CardContent } from "@web/components/ui/card";

export function InstructionsTab({ instructions }: { instructions: string }) {
	return (
		<Card>
			<CardContent>
				<MarkdownViewer
					value={instructions}
					jsxComponentDescriptors={[labCheckReadonlyEditorDescriptor]}
				/>
			</CardContent>
		</Card>
	);
}
